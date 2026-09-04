"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Internal action that verifies the Stripe webhook signature using the Stripe SDK (Node.js).
 * Called by the httpAction in stripeWebhook.ts which cannot use "use node".
 *
 * WHY IT NORMALISES FIVE EVENT TYPES AND NOT ONE: it used to extract a payload
 * for `checkout.session.completed` alone, and the handler acted on that alone.
 * `payment_intent.succeeded`, `payment_intent.payment_failed`,
 * `charge.refunded` and `charge.dispute.created` were verified, answered 200,
 * and thrown away — so a refund issued from the Stripe dashboard never reached
 * our books, and a charge whose completion event was lost had nothing else that
 * could confirm it.
 *
 * THE FIELD THAT IS NOT THERE: only the checkout session carries our
 * `metadata.orderId`, because `createCheckoutSession` sets it on the SESSION.
 * A payment intent and a charge are different objects and carry none of it.
 * That is why every non-checkout case below reports a payment intent id and no
 * order: the handler resolves it through `payments.externalId`, which is where
 * that intent was stored when the charge was first settled.
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

      // The delivery's own id, on every path. Stripe retries until it gets a
      // 2xx and may repeat a delivery even after one, so the caller needs this
      // to tell a retry from a new event. It was not returned at all, which is
      // why the handler had no way to deduplicate.
      const envelope = { eventId: event.id, eventType: event.type };

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        return {
          ...envelope,
          orderId: session.metadata?.orderId ?? null,
          storeId: session.metadata?.storeId ?? null,
          paymentStatus: session.payment_status ?? null,
          amountTotal: session.amount_total ?? null,
          currency: session.currency?.toUpperCase() ?? "EUR",
          paymentIntent: String(session.payment_intent ?? session.id),
        };
      }

      if (event.type === "payment_intent.succeeded") {
        const intent = event.data.object;
        return {
          ...envelope,
          // The intent id IS what `payments.externalId` holds for a Stripe
          // charge, so this is the whole of the lookup key.
          paymentIntent: intent.id,
          amountTotal: intent.amount_received ?? intent.amount ?? null,
          currency: intent.currency?.toUpperCase() ?? "EUR",
        };
      }

      if (event.type === "payment_intent.payment_failed") {
        const intent = event.data.object;
        return {
          ...envelope,
          paymentIntent: intent.id,
          amountTotal: intent.amount ?? null,
          currency: intent.currency?.toUpperCase() ?? "EUR",
          failureMessage:
            intent.last_payment_error?.message ??
            intent.last_payment_error?.code ??
            null,
        };
      }

      if (event.type === "charge.refunded") {
        const charge = event.data.object;
        return {
          ...envelope,
          paymentIntent:
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : (charge.payment_intent?.id ?? null),
          chargeId: charge.id,
          currency: charge.currency?.toUpperCase() ?? "EUR",
          // CUMULATIVE for the charge, not the amount of this one refund. The
          // handler stores it as a total for exactly that reason.
          amountRefunded: charge.amount_refunded ?? null,
          fullyRefunded: charge.refunded === true,
        };
      }

      if (event.type === "charge.dispute.created") {
        const dispute = event.data.object;
        return {
          ...envelope,
          paymentIntent:
            typeof dispute.payment_intent === "string"
              ? dispute.payment_intent
              : (dispute.payment_intent?.id ?? null),
          chargeId:
            typeof dispute.charge === "string"
              ? dispute.charge
              : (dispute.charge?.id ?? null),
          currency: dispute.currency?.toUpperCase() ?? "EUR",
          // Stripe withdraws the disputed amount immediately. It is money that
          // has left, so it is recorded the same way a refund is.
          amountDisputed: dispute.amount ?? null,
          disputeReason: dispute.reason ?? null,
        };
      }

      // Same id on the path we do not handle: the caller still records the
      // delivery, so an unhandled type is not re-examined on every retry.
      return envelope;
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err);
      return { error: "invalid_signature" };
    }
  },
});
