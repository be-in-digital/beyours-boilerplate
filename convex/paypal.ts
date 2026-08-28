"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  assertSettlesOrder,
  readPayPalCapture,
} from "@be-in-digital/convex-functions/paymentSettlement";

// ---------------------------------------------------------------------------
// PayPal helpers
// ---------------------------------------------------------------------------

interface PayPalEnv {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

function getPayPalEnv(): PayPalEnv {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic import in Convex "use node" context
  const { getSiteEnv } = require("@be-in-digital/core/env");
  const site = getSiteEnv();
  const clientId = site.PAYPAL_CLIENT_ID;
  const clientSecret = site.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  // Sandbox is an explicit setting, not a guess. The previous heuristic —
  // `clientId.startsWith("sb-") || clientId.startsWith("A") === false` — sent
  // every live client id that did not happen to begin with "A" to the sandbox
  // host, where payments are never actually collected.
  //
  // Follows the UBER_EATS_SANDBOX_MODE / DELIVEROO_IS_SANDBOX convention: unset
  // means PRODUCTION, so a missing variable never silently voids real payments.
  const isSandbox = site.PAYPAL_SANDBOX_MODE === "true";
  const baseUrl = isSandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  return { clientId, clientSecret, baseUrl };
}

async function getAccessToken(env: PayPalEnv): Promise<string> {
  const auth = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString(
    "base64"
  );

  const response = await fetch(`${env.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get PayPal access token");
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Create a PayPal order and return the approval URL for redirect.
 */
// @public-by-design: a guest checking out has no account; the amount is read from the order server-side, never taken from the caller
export const createPayPalOrder = action({
  args: {
    orderId: v.id("orders"),
    returnUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orders.internalGetById, {
      id: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    const env = getPayPalEnv();
    const accessToken = await getAccessToken(env);

    const response = await fetch(`${env.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: args.orderId,
            description: `Commande #${order.orderNumber}`,
            amount: {
              currency_code: "EUR",
              value: (order.total / 100).toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: args.returnUrl,
          cancel_url: args.cancelUrl,
          user_action: "PAY_NOW",
          brand_name: "Restaurant",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `PayPal order creation failed: ${JSON.stringify(error)}`
      );
    }

    const paypalOrder = (await response.json()) as {
      id: string;
      links: Array<{ rel: string; href: string }>;
    };

    const approvalLink = paypalOrder.links.find(
      (l) => l.rel === "approve"
    );
    if (!approvalLink) {
      throw new Error("PayPal did not return an approval URL");
    }

    return {
      approvalUrl: approvalLink.href,
      paypalOrderId: paypalOrder.id,
    };
  },
});

/**
 * Capture a PayPal order after user approval.
 * Updates order and creates payment record.
 */
// @public-by-design: called from the return page by a guest; assertSettlesOrder binds the capture to this order, currency and amount
export const capturePayPalOrder = action({
  args: {
    paypalOrderId: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    orderId: Id<"orders">;
    orderNumber?: string;
    viewToken?: string;
    email?: string;
  }> => {
    interface OrderData {
      total: number;
      orderNumber: string;
      storeId: string;
      paymentStatus: string;
      viewToken?: string;
      customerInfo?: { email?: string };
    }

    // Read the order BEFORE calling PayPal.
    //
    // A capture can only happen once. The customer who reloads the confirmation
    // page — or comes back to it from their history — used to send a second
    // capture, get ORDER_ALREADY_CAPTURED back, and land on "Confirmation
    // impossible" for an order that was paid. The client-side `hasRun` ref only
    // ever protected against a re-render, never against a reload; idempotence
    // belongs here, where the truth is.
    const order: OrderData | null = await ctx.runQuery(internal.orders.internalGetById, {
      id: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    if (order.paymentStatus === "paid") {
      return {
        status: "paid" as const,
        orderId: args.orderId,
        orderNumber: order.orderNumber,
        viewToken: order.viewToken,
        email: order.customerInfo?.email,
      };
    }

    const env = getPayPalEnv();
    const accessToken = await getAccessToken(env);

    const response = await fetch(
      `${env.baseUrl}/v2/checkout/orders/${args.paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`PayPal capture failed: ${JSON.stringify(error)}`);
    }

    const capture = (await response.json()) as {
      id: string;
      status: string;
      purchase_units?: Array<{
        reference_id?: string;
        payments?: {
          captures?: Array<{
            id?: string;
            amount?: { currency_code?: string; value?: string };
          }>;
        };
      }>;
    };

    const captured = readPayPalCapture(capture);

    if (capture.status === "COMPLETED") {
      // `reference_id` was set to the order id at creation but never read back,
      // so a completed capture for any order marked THIS one paid. Both the
      // reference and the captured amount must match before settling.
      assertSettlesOrder(
        {
          provider: "paypal",
          reference: captured.reference,
          amountMajor: captured.amountMajor,
          currency: captured.currency,
        },
        { orderId: args.orderId, total: order.total }
      );

      if (order.paymentStatus !== "paid") {
        await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
          id: args.orderId,
          paymentStatus: "paid",
        });

        try {
          await ctx.runMutation(internal.payments.internalCreate, {
            orderId: args.orderId,
            storeId: order.storeId as Id<"stores">,
            amount: order.total,
            currency: "EUR",
            provider: "paypal",
            // The CAPTURE id, not the order id: PayPal refunds are issued
            // against a capture. Storing the order id here would have made
            // every refund attempt fail at the provider.
            externalId: captured.captureId ?? args.paypalOrderId,
          });
        } catch {
          // Payment record may already exist
        }
      }

      return {
        status: "paid" as const,
        orderId: args.orderId,
        orderNumber: order.orderNumber,
        viewToken: order.viewToken,
        email: order.customerInfo?.email,
      };
    }

    return {
      status: capture.status.toLowerCase(),
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      viewToken: order.viewToken,
    };
  },
});

/**
 * Issue a refund against a PayPal capture.
 *
 * Internal: the orchestration, authorisation and bookkeeping live in
 * `payments.refundPayment`. This only talks to PayPal and reports what it said.
 */
export const internalRefund = internalAction({
  args: {
    captureId: v.string(),
    /** Amount in cents. */
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (_ctx, args): Promise<{ refundId: string }> => {
    const env = getPayPalEnv();
    const accessToken = await getAccessToken(env);

    const response = await fetch(
      `${env.baseUrl}/v2/payments/captures/${args.captureId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: {
            value: (args.amount / 100).toFixed(2),
            currency_code: args.currency,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      throw new Error(`PayPal refund failed: ${error || response.status}`);
    }

    const refund = (await response.json()) as { id?: string; status?: string };

    // PayPal reports COMPLETED or PENDING. Anything else is not a refund.
    if (refund.status && !["COMPLETED", "PENDING"].includes(refund.status)) {
      throw new Error(`PayPal refund returned status ${refund.status}`);
    }

    return { refundId: refund.id ?? args.captureId };
  },
});
