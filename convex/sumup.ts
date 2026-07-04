"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

    if (
      (checkout.status === "PAID" || checkout.status === "AUTHORIZED") &&
      order
    ) {
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
      orderNumber: order?.orderNumber,
      viewToken: order?.viewToken,
    };
  },
});
