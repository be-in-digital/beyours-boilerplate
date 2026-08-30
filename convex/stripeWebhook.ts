import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Stripe webhook handler (Convex HTTP action).
 * Delegates Stripe SDK signature verification to a Node.js internalAction
 * because httpAction cannot use "use node".
 */
// @guarded-inline: the Stripe SDK verifies the signature in
// internal.stripeWebhookVerify.verify before anything here reads the event
export const handleWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  // Verify signature in Node.js runtime (Stripe SDK requires it)
  const result = (await ctx.runAction(internal.stripeWebhookVerify.verify, {
    body,
    signature,
  })) as Record<string, unknown>;

  if (result.error === "not_configured") {
    return new Response("Stripe not configured", { status: 500 });
  }
  if (result.error === "invalid_signature") {
    return new Response("Invalid signature", { status: 400 });
  }

  if (
    result.eventType === "checkout.session.completed" &&
    result.orderId &&
    result.paymentStatus === "paid"
  ) {
    const orderId = result.orderId as Id<"orders">;
    const storeId = result.storeId as Id<"stores"> | null;

    const order = await ctx.runQuery(internal.orders.internalGetById, {
      id: orderId,
    });

    if (order && order.paymentStatus !== "paid") {
      await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
        id: orderId,
        paymentStatus: "paid",
      });

      try {
        const paymentId = await ctx.runMutation(
          internal.payments.internalCreate,
          {
            orderId,
            storeId: storeId ?? order.storeId,
            amount: (result.amountTotal as number) ?? order.total,
            currency: (result.currency as string) ?? "EUR",
            provider: "stripe",
            externalId: String(result.paymentIntent ?? ""),
          }
        );
        await ctx.runMutation(internal.payments.internalUpdateStatus, {
          id: paymentId,
          status: "succeeded",
        });
      } catch {
        // Payment record may already exist from success page verification
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
