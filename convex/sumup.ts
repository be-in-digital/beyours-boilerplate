"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  assertSettlesOrder,
  orderAlreadyCollected,
  paymentStatusAfterSettlement,
} from "@be-in-digital/convex-functions/paymentSettlement";
import {
  CardPaymentUnavailableError,
  OrderAlreadyPaidError,
} from "@be-in-digital/convex-functions/refusal";

// ---------------------------------------------------------------------------
// Inline AES-256-GCM decryption (same pattern as oauthConnect.ts)
// ---------------------------------------------------------------------------

async function decrypt(encrypted: string): Promise<string> {
  const { createDecipheriv } = await import("crypto");
  const { getSiteEnv } = await import("@be-in-digital/core/env");
  const hex = getSiteEnv().ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string");
  }

  const key = Buffer.from(hex, "hex");
  const parts = encrypted.split(":");
  const iv = Buffer.from(parts[0] ?? "", "base64");
  const authTag = Buffer.from(parts[1] ?? "", "base64");
  const ciphertext = Buffer.from(parts[2] ?? "", "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Get decrypted SumUp access token from paymentConnections.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Convex action context
async function getSumUpAccessToken(ctx: any): Promise<{ accessToken: string; merchantCode: string }> {
  const connection = await ctx.runQuery(
    internal.paymentConnections.internalGetByProvider,
    { provider: "sumup" as const }
  );
  if (!connection || connection.status !== "connected") {
    throw new Error("SumUp is not connected");
  }
  if (!connection.encryptedAccessToken) {
    throw new Error("SumUp access token is missing");
  }

  const accessToken = await decrypt(connection.encryptedAccessToken);
  return { accessToken, merchantCode: connection.merchantId };
}

/**
 * Create a SumUp checkout for card payment.
 * Returns checkoutId to be used with SumUp Card Widget.
 */
// @public-by-design: a guest checking out has no account; the amount is read from the order server-side, never taken from the caller
export const createCheckout = action({
  args: {
    orderId: v.id("orders"),
    redirectUrl: v.string(),
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

    // The diner-facing path says WHY a card cannot be taken instead of letting
    // `getSumUpAccessToken`'s plain `Error` reach the browser as a redacted
    // "Server Error" behind the generic retry toast (#374). The helper keeps
    // its own throws: verify and refund read them from a log, not a table.
    const connection = await ctx.runQuery(
      internal.paymentConnections.internalGetByProvider,
      { provider: "sumup" as const }
    );
    if (
      !connection ||
      connection.status !== "connected" ||
      !connection.encryptedAccessToken
    ) {
      throw new CardPaymentUnavailableError();
    }

    const { accessToken, merchantCode } = await getSumUpAccessToken(ctx);

    const response = await fetch(
      "https://api.payments.sumup.com/v0.1/checkouts",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkout_reference: args.orderId,
          amount: order.total / 100,
          currency: "EUR",
          pay_to_email: merchantCode,
          redirect_url: args.redirectUrl,
          description: `Commande #${order.orderNumber}`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`SumUp checkout creation failed: ${JSON.stringify(error)}`);
    }

    const checkout = (await response.json()) as { id: string; status: string };

    return { checkoutId: checkout.id };
  },
});

/**
 * Verify a SumUp checkout after payment.
 * Updates order and creates payment record if paid.
 */
// @public-by-design: called from the return page by a guest; assertSettlesOrder binds the checkout to this order, currency and amount
export const verifyCheckout = action({
  args: {
    checkoutId: v.string(),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    orderId: Id<"orders">;
    orderNumber?: string;
    viewToken?: string;
    email?: string;
  }> => {
    const { accessToken } = await getSumUpAccessToken(ctx);

    const response = await fetch(
      `https://api.payments.sumup.com/v0.1/checkouts/${args.checkoutId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to verify SumUp checkout");
    }

    const checkout = (await response.json()) as {
      id: string;
      status: string;
      transaction_id?: string;
      checkout_reference?: string;
      amount?: number;
      currency?: string;
    };

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
    const order: OrderData | null = await ctx.runQuery(internal.orders.internalGetById, {
      id: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    if (checkout.status === "PAID" || checkout.status === "AUTHORIZED") {
      // The checkout id and the order id arrive as independent arguments, so
      // nothing stops a caller pairing a cheap paid checkout with an expensive
      // pending order. SumUp echoes back the reference we set at creation and
      // the amount it actually took — both must match before anything settles.
      assertSettlesOrder(
        {
          provider: "sumup",
          reference: checkout.checkout_reference,
          amountMajor: checkout.amount,
          currency: checkout.currency,
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

      // One mutation, one transaction: keyed on the SumUp transaction id, so a
      // second verification of the same checkout returns the row that already
      // exists instead of writing another refundable one.
      //
      // Unconditional now: the row records that the money moved, which stays
      // true whether the order ends up paid or awaiting a refund.
      await ctx.runMutation(internal.payments.internalSettle, {
        orderId: args.orderId,
        storeId: order.storeId as Id<"stores">,
        amount: order.total,
        currency: "EUR",
        provider: "sumup",
        externalId: checkout.transaction_id ?? checkout.id,
      });

      return {
        status: "paid" as const,
        orderId: args.orderId,
        orderNumber: order.orderNumber,
        viewToken: order.viewToken,
        email: order.customerInfo?.email,
      };
    }

    return {
      status: checkout.status.toLowerCase(),
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      viewToken: order.viewToken,
    };
  },
});

/**
 * Issue a refund against a SumUp transaction.
 *
 * Internal: authorisation and bookkeeping live in `payments.refundPayment`.
 * This only talks to SumUp and reports what it said.
 */
export const internalRefund = internalAction({
  args: {
    /** The stored SumUp transaction id. */
    externalId: v.string(),
    /** Amount in cents. */
    amount: v.number(),
  },
  handler: async (ctx, args): Promise<{ refundId: string }> => {
    const { accessToken } = await getSumUpAccessToken(ctx);

    const response = await fetch(
      `https://api.sumup.com/v0.1/me/refund/${args.externalId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // SumUp expects major units, like the checkout creation above.
        body: JSON.stringify({ amount: args.amount / 100 }),
      }
    );

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      throw new Error(`SumUp refund failed: ${error || response.status}`);
    }

    // SumUp answers 204 No Content on success and returns no refund id, so the
    // transaction id is the only reconciliation handle available.
    return { refundId: args.externalId };
  },
});
