"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { settleOrRecordRefusal } from "./settlementReturn";
import type { Id } from "./_generated/dataModel";
import {
  assertSettlesOrder,
  orderAlreadyCollected,
  paymentStatusAfterSettlement,
  readPayPalCapture,
} from "@be-in-digital/convex-functions/paymentSettlement";
import { OrderAlreadyPaidError } from "@be-in-digital/convex-functions/refusal";
import { assertCardChargeable } from "@be-in-digital/convex-functions/cardChargeFloor";

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
  const { getSiteEnv, isSandbox } = require("@be-in-digital/core/env");
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
  // PAYPAL_SANDBOX_MODE is required at boot as soon as PayPal is configured
  // (see @be-in-digital/core/env). Left unset anyway — on a Convex deployment,
  // which runs no boot check of its own — it resolves to SANDBOX, never to the
  // live host: a capture that does not settle is recoverable, a live charge
  // against test credentials is not.
  const sandbox = isSandbox("paypal");
  const baseUrl = sandbox
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

    // Nothing is owed twice. `orders.create` is idempotent on the diner's key,
    // so a back-navigation and a resubmit land on the SAME order — and opening
    // a payment on one that is already settled charges the same meal again.
    // The ledger refuses the second row afterwards (#411), which keeps the
    // books right and leaves the diner debited and waiting for a refund. This
    // is what stops the charge being taken. Every provider needs it: the rule
    // is about the order, not about which page the diner happens to be on.
    //
    // Both reads, for the reason `stripe.ts` sets out: the status counts a
    // refunded order as closed, and the ledger catches the window between a
    // payment row being written and the status catching up.
    if (
      orderAlreadyCollected(order.paymentStatus) ||
      (await ctx.runQuery(internal.payments.internalCollectionOnOrder, {
        orderId: args.orderId,
      })) !== null
    ) {
      throw new OrderAlreadyPaidError();
    }

    // A total no card provider will take. Stripe's EUR floor is 0,50 € and the
    // session create is what would otherwise discover that — as a plain SDK
    // error, redacted to "Server Error" behind the checkout's retry toast, on
    // an order that can never be paid however many times the diner tries. A
    // 100 % coupon is the ordinary way to reach it.
    //
    // `"EUR"` rather than `globalSettings.currency` on purpose: EUR is what
    // this request actually sends below, so the floor has to be the one that
    // applies to it.
    assertCardChargeable({ amountMinor: order.total, currency: "EUR" });

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
      // Needed by `paymentStatusAfterSettlement`: money arriving for a
      // cancelled order is owed back, not "paid".
      status: string;
      paymentStatus: string;
      // Needed by `assertSettlesOrder`: an order already collected through
      // another method does not accept a second settlement (#378).
      paymentMethod?: string;
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
        {
          orderId: args.orderId,
          total: order.total,
          // An order already collected through another method does not accept
          // a second settlement (#378).
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
        }
      );

      // THE LEDGER FIRST, THEN THE ORDER — the same order `stripeWebhook.ts`
      // states, and the reason is the same on a return page.
      //
      // These are two mutations and therefore two transactions. Marking the
      // order paid first COMMITS that, and the settlement can still refuse
      // afterwards. The order was then left reading « Payé » with no payment
      // row against it: the money is not on the ledger, the invoice is minted
      // against a total nothing backs, and the diner's confirmation is on its
      // way. Probed: 2 400 c taken, 1 200 c recorded, `FA-2026-000001` issued.
      //
      // Settling first is safe in the other direction: the settlement reads
      // nothing about the order's status, and one that succeeds is exactly the
      // case in which the status write is wanted.
      //
      // One mutation, one transaction: keyed on the capture id, so a second
      // capture attempt for the same PayPal order returns the row that already
      // exists instead of writing another refundable one.
      //
      // Unconditional now: the row records that the money moved, which stays
      // true whether the order ends up paid or awaiting a refund.
      await settleOrRecordRefusal(ctx, {
        orderId: args.orderId,
        storeId: order.storeId as Id<"stores">,
        amount: order.total,
        currency: "EUR",
        provider: "paypal",
        // The CAPTURE id, not the order id: PayPal refunds are issued against a
        // capture. Storing the order id here would have made every refund
        // attempt fail at the provider.
        externalId: captured.captureId ?? args.paypalOrderId,
      });
      // What this settlement should do to the ORDER — which is not always
      // "mark it paid". `refund_pending` (paid, then cancelled, money owed
      // back) is not "paid", so the old `if (order.paymentStatus !== "paid")`
      // walked into the branch and wrote the marker away; a provider retry or
      // a refreshed success tab was enough. The payment row is recorded either
      // way: the money moved, and a refund needs something to point at.
      const nextPaymentStatus = paymentStatusAfterSettlement(order);
      if (nextPaymentStatus) {
        await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
          id: args.orderId,
          paymentStatus: nextPaymentStatus,
        });
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
    /** See `payments.refundPayment`; PayPal spells it `PayPal-Request-Id`. */
    idempotencyKey: v.optional(v.string()),
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
          // PayPal's idempotency header. A replayed request returns the
          // original refund instead of issuing a second one.
          ...(args.idempotencyKey
            ? { "PayPal-Request-Id": args.idempotencyKey }
            : {}),
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
