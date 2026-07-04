"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

  // Detect sandbox mode: sandbox client IDs typically start with specific patterns
  const isSandbox =
    clientId.startsWith("sb-") || clientId.startsWith("A") === false;
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
    };

    interface OrderData {
      total: number;
      orderNumber: string;
      storeId: string;
      paymentStatus: string;
      viewToken?: string;
      customerInfo?: { email?: string };
    }
    const order: OrderData | null = await ctx.runQuery(internal.orders.internalGetById, {
      id: args.orderId,
    });

    if (capture.status === "COMPLETED" && order) {
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
            externalId: args.paypalOrderId,
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
      orderNumber: order?.orderNumber,
      viewToken: order?.viewToken,
    };
  },
});
