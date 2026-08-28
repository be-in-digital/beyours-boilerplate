"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { assertSettlesOrder } from "@be-in-digital/convex-functions/paymentSettlement";

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
      paymentStatus: string;
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
        { orderId: args.orderId, total: order.total }
      );

      if (order.paymentStatus !== "paid") {
        await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
          id: args.orderId,
          paymentStatus: "paid",
        });

        try {
          const paymentId = await ctx.runMutation(internal.payments.internalCreate, {
            orderId: args.orderId,
            storeId: order.storeId as Id<"stores">,
            amount: order.total,
            currency: "EUR",
            provider: "sumup",
            externalId: checkout.transaction_id ?? checkout.id,
          });
          await ctx.runMutation(internal.payments.internalUpdateStatus, {
            id: paymentId,
            status: "succeeded",
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
