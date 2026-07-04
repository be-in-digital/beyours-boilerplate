"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Internal action that verifies the Stripe webhook signature using the Stripe SDK (Node.js).
 * Called by the httpAction in stripeWebhook.ts which cannot use "use node".
 */
export const verify = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (_ctx, args): Promise<Record<string, unknown>> => {
    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");
    const site = getSiteEnv();

    const secretKey = site.STRIPE_SECRET_KEY;
    const webhookSecret = site.STRIPE_WEBHOOK_SECRET;
    if (!secretKey || !webhookSecret) {
      return { error: "not_configured" };
    }

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    try {
      const event = await stripe.webhooks.constructEventAsync(
        args.body,
        args.signature,
        webhookSecret
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        return {
          eventType: event.type,
          orderId: session.metadata?.orderId ?? null,
          storeId: session.metadata?.storeId ?? null,
          paymentStatus: session.payment_status ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency?.toUpperCase() ?? "EUR",
          paymentIntent: String(session.payment_intent ?? session.id),
        };
      }

      return { eventType: event.type };
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return { error: "invalid_signature" };
    }
  },
});
