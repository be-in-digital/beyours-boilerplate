/**
 * BeYours Stripe Webhook Handler (httpAction entry point)
 *
 * Receives POST /webhooks/stripe-bid from Stripe.
 * Reads raw body + Stripe-Signature header, delegates to processWebhookEvent
 * (internalAction in "use node" file) for signature verification and processing.
 */

import { httpAction } from "./_generated/server";
import { internal as _internal } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

export const handleWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  try {
    await ctx.runAction(internal.bidSubscription.processWebhookEvent, {
      body,
      signature,
    });
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Stripe BID webhook error:", error);
    // Return 500 for transient errors so Stripe retries; 400 would stop retries permanently
    return new Response("Webhook processing error", { status: 500 });
  }
});
