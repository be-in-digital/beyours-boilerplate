"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

interface OrderData {
  total: number;
  orderNumber: string;
  storeId: string;
  paymentStatus: string;
  viewToken?: string;
  customerInfo?: { email?: string };
}

/**
 * Create a Stripe Checkout Session for card payment.
 * Redirects user to Stripe's hosted payment page.
 */
export const createCheckoutSession = action({
  args: {
    orderId: v.id("orders"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sessionUrl: string; sessionId: string }> => {
    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");
    const site = getSiteEnv();

    const secretKey = site.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const order: OrderData | null = await ctx.runQuery(internal.orders.internalGetById, {
      id: args.orderId,
    });
    if (!order) throw new Error("Order not found");

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session: { url: string | null; id: string } = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: order.total,
            product_data: {
              name: `Commande #${order.orderNumber}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${args.successUrl}${args.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: args.cancelUrl,
      metadata: {
        orderId: args.orderId,
        storeId: order.storeId,
      },
      ...(order.customerInfo?.email
        ? { customer_email: order.customerInfo.email }
        : {}),
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return { sessionUrl: session.url, sessionId: session.id };
  },
});

/**
 * Verify a Stripe Checkout Session after redirect.
 * Updates order and creates payment record if paid.
 */
export const verifyCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    orderId?: Id<"orders">;
    orderNumber?: string;
    viewToken?: string;
    email?: string;
    error?: string;
  }> => {
    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");
    const site = getSiteEnv();

    const secretKey = site.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const rawSession = await stripe.checkout.sessions.retrieve(args.sessionId);
    const orderId = rawSession.metadata?.orderId as Id<"orders"> | undefined;
    const storeId = rawSession.metadata?.storeId as Id<"stores"> | undefined;

    if (!orderId) {
      return { status: "error", error: "Missing orderId in session metadata" };
    }

    // Fetch order for response data
    const order: OrderData | null = await ctx.runQuery(internal.orders.internalGetById, {
      id: orderId,
    });

    if (rawSession.payment_status === "paid" && order) {
      // Idempotent: skip if already paid
      if (order.paymentStatus !== "paid") {
        await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
          id: orderId,
          paymentStatus: "paid",
        });

        // Create payment record and mark as succeeded (idempotent)
        try {
          const paymentId = await ctx.runMutation(internal.payments.internalCreate, {
            orderId,
            storeId: storeId ?? (order.storeId as Id<"stores">),
            amount: rawSession.amount_total ?? order.total,
            currency: rawSession.currency?.toUpperCase() ?? "EUR",
            provider: "stripe",
            externalId: String(rawSession.payment_intent ?? rawSession.id),
          });
          await ctx.runMutation(internal.payments.internalUpdateStatus, {
            id: paymentId,
            status: "succeeded",
          });
        } catch {
          // Payment record may already exist from webhook
        }
      }

      return {
        status: "paid" as const,
        orderId,
        orderNumber: order.orderNumber,
        viewToken: order.viewToken,
        email: order.customerInfo?.email,
      };
    }

    return {
      status: (rawSession.payment_status ?? "unpaid") as string,
      orderId,
      orderNumber: order?.orderNumber,
      viewToken: order?.viewToken,
    };
  },
});
