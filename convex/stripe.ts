"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  assertSettlesOrder,
  paymentStatusAfterSettlement,
  readStripeCheckoutSession,
} from "@be-in-digital/convex-functions/paymentSettlement";
import {
  resolveStripeCharge,
  StripeChargeRouteError,
} from "@be-in-digital/convex-functions/stripeChargeRouting";
import { CardPaymentUnavailableError } from "@be-in-digital/convex-functions/refusal";

interface OrderData {
  total: number;
  orderNumber: string;
  storeId: string;
  // Needed by `paymentStatusAfterSettlement`: money arriving for a cancelled
  // order is owed back, not "paid".
  status: string;
  paymentStatus: string;
  viewToken?: string;
  customerInfo?: { email?: string };
}

/**
 * Refuse to move money on a connection state this module cannot honour.
 *
 * `resolveStripeCharge` throws for exactly one status — `connected`, the literal
 * whose meaning is "charges are routed to the connected account" — and answers
 * "platform" for every other state, `onboarding_complete` and no row included.
 * Nothing writes `connected` for Stripe today: `oauthCallbackHandlers.ts` writes
 * `onboarding_complete` or `error`, precisely because this file charges on the
 * PLATFORM key and sends no `stripeAccount`, `on_behalf_of` or `transfer_data`.
 * So this changes nothing about how a restaurant is charged today. It is a
 * tripwire: the row that would make the admin lie again is now one the money
 * paths read, and putting the lie back cannot be done quietly.
 *
 * Refusing on the mere PRESENCE of a Stripe connection would be the wrong rule
 * and a severe regression — finishing Connect onboarding would break card
 * payments outright, and the admin already tells the owner the truth in that
 * state.
 *
 * Called from the paths that START a movement of money: the checkout session and
 * the refund. Deliberately NOT from `verifyCheckoutSession`, the webhook or
 * `reconcilePendingCheckouts` — those record money that has ALREADY moved, and
 * refusing there would leave a real charge with no payment row and no order
 * marked paid, which is worse than the mis-routing being complained about.
 *
 * See `tasks/stripe-connect-runbook.md` for the half deliberately not done here.
 */
async function assertChargeableOnPlatform(ctx: ActionCtx): Promise<void> {
  const connection = await ctx.runQuery(
    internal.paymentConnections.internalGetByProvider,
    { provider: "stripe" as const }
  );

  resolveStripeCharge(connection);
}

/**
 * Create a Stripe Checkout Session for card payment.
 * Redirects user to Stripe's hosted payment page.
 */
// @public-by-design: a guest checking out has no account; the amount is read from the order server-side, never taken from the caller
export const createCheckoutSession = action({
  args: {
    orderId: v.id("orders"),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ sessionUrl: string; sessionId: string }> => {
    // First, before the SDK is even loaded: a connection state this file cannot
    // honour must stop the charge, not shape it. To the diner both refusals
    // below are one fact — this deployment cannot take a card — and a plain
    // `Error` here reached them as a redacted "Server Error" behind the
    // checkout's generic retry toast, on the very path a fresh deployment
    // pre-selected (#374). `CardPaymentUnavailableError` is a `ConvexError`,
    // so the French sentence survives the wire; the routing detail stays in
    // the log via the admin surfaces that read the connection row.
    try {
      await assertChargeableOnPlatform(ctx);
    } catch (error) {
      if (error instanceof StripeChargeRouteError) {
        throw new CardPaymentUnavailableError();
      }
      throw error;
    }

    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");
    const site = getSiteEnv();

    const secretKey = site.STRIPE_SECRET_KEY;
    if (!secretKey) throw new CardPaymentUnavailableError();

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

    // Keep the session id. It used to be handed to the browser and stored
    // nowhere, so a customer who paid and then closed the tab left a paid Stripe
    // charge, an order at `paymentStatus: "pending"` and no way for us to name
    // the session to Stripe and ask what happened. `reconcilePendingCheckouts`
    // reads it back.
    await ctx.runMutation(internal.payments.internalAttachCheckoutSession, {
      orderId: args.orderId,
      checkoutSessionId: session.id,
    });

    return { sessionUrl: session.url, sessionId: session.id };
  },
});

/**
 * Verify a Stripe Checkout Session after redirect.
 * Updates order and creates payment record if paid.
 */
// @public-by-design: called from the return page by a guest; the session id is the only
// argument and the order comes from that same session's metadata, so nothing a caller
// supplies chooses which order is settled. assertSettlesOrder then binds the amount and
// currency Stripe reports to the order total before anything is marked paid.
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
      // Before the idempotency check, not after: an order already marked paid
      // must not let a mismatched session through unexamined.
      //
      // The reference check is tautological on this path — `orderId` came from
      // this very session's metadata, so it cannot name a different order. It
      // stays because it costs nothing and keeps the guard identical across the
      // three providers. What this genuinely closes is the AMOUNT and CURRENCY
      // binding: `amount_total` was recorded as the settlement with nothing
      // compared to it, so a session worth less than the order — an order
      // edited after the session was created, a Stripe-side coupon, a stale
      // session for an earlier cart — flipped the order to `paid` and booked
      // the smaller sum as payment in full.
      const settlement = readStripeCheckoutSession(rawSession);
      assertSettlesOrder(
        {
          provider: "stripe",
          reference: settlement.reference,
          // Stripe reports MINOR units. This must never go through the
          // major-unit field: it would be multiplied by 100 and reject every
          // legitimate payment.
          amountMinor: settlement.amountMinor,
          currency: settlement.currency,
        },
        { orderId, total: order.total }
      );

      // What this settlement should do to the ORDER — which is not always
      // "mark it paid". `refund_pending` (paid, then cancelled, money owed
      // back) is not "paid", so the old `if (order.paymentStatus !== "paid")`
      // walked into the branch and wrote the marker away; a Stripe retry or a
      // refreshed success tab was enough. The payment row is recorded either
      // way: the money moved, and a refund needs something to point at.
      const nextPaymentStatus = paymentStatusAfterSettlement(order);
      if (nextPaymentStatus) {
        await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
          id: orderId,
          paymentStatus: nextPaymentStatus,
        });
      }

      // One mutation, one transaction. The webhook settles this same charge
      // from a DIFFERENT event, and the two used to race: each read
      // `paymentStatus !== "paid"` and then wrote, so the loser still inserted
      // a second `succeeded` row for one charge — and each row was
      // independently refundable. `internalSettle` keys on the payment intent
      // and makes the second caller a no-op.
      //
      // Unconditional now: the row records that the money moved, which stays
      // true whether the order ends up paid or awaiting a refund.
      await ctx.runMutation(internal.payments.internalSettle, {
        orderId,
        storeId: storeId ?? (order.storeId as Id<"stores">),
        // The order total, not the provider's number. After the assert the two
        // are equal by construction, and this closes the last path by which a
        // provider-reported amount reached the ledger unchecked.
        // Matches sumup.ts and paypal.ts.
        amount: order.total,
        currency: settlement.currency ?? "EUR",
        provider: "stripe",
        externalId: String(settlement.paymentIntentId ?? rawSession.id),
      });

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

/**
 * Issue a refund against a Stripe payment intent.
 *
 * Internal: authorisation and bookkeeping live in `payments.refundPayment`.
 * This only talks to Stripe and reports what it said.
 */
export const internalRefund = internalAction({
  args: {
    /** The stored payment intent id (`pi_…`). */
    externalId: v.string(),
    /** Amount in cents. */
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ refundId: string }> => {
    // The same gate as `createCheckoutSession`, on purpose. A refund that
    // ignored the rule while checkout honoured it is the same split this
    // repository keeps hitting: the two halves of one charge would disagree
    // about which account they belong to.
    await assertChargeableOnPlatform(ctx);

    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");

    const secretKey = getSiteEnv().STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Stripe's own `reason` field is a closed enum, so the operator's free-text
    // motive goes to metadata where it survives without being rejected.
    const refund = await stripe.refunds.create({
      payment_intent: args.externalId,
      amount: args.amount,
      metadata: args.reason ? { motif: args.reason.slice(0, 500) } : undefined,
    });

    // `pending` is legitimate for some payment methods; `failed` and `canceled`
    // are not refunds and must not be recorded as such.
    if (refund.status && !["succeeded", "pending"].includes(refund.status)) {
      throw new Error(`Stripe a refusé le remboursement (statut ${refund.status}).`);
    }

    return { refundId: refund.id };
  },
});

/**
 * Ask Stripe what really happened to the checkouts that never came back paid.
 *
 * WHY THIS EXISTS: every path that marked an order paid was a message we had to
 * RECEIVE — the customer landing on the confirmation page, or a webhook
 * delivery. Neither is guaranteed. A guest who pays and closes the tab sends
 * neither, and if the `checkout.session.completed` delivery is also lost the
 * charge sits in Stripe with an order at `paymentStatus: "pending"` behind it.
 * The kitchen never sees the order and the customer has paid. Nothing detected
 * that, ever, because detecting it means asking rather than waiting.
 *
 * This is the asking. It runs on the scheduler and takes the same route as
 * every other settlement: `assertSettlesOrder` binds the amount and currency to
 * the order, `paymentStatusAfterSettlement` decides what the order becomes, and
 * `internalSettle` writes the payment row — so a session that also arrived by
 * webhook produces no second row, and a session for a cancelled order is
 * recorded as money owed back rather than as a paid order.
 *
 * The window has both ends. Below `minAgeMinutes` the customer may still be on
 * Stripe's payment page; above `maxAgeHours` the session has expired on Stripe's
 * side and there is nothing left to retrieve.
 *
 * One order's failure does not stop the sweep: a mismatched amount throws from
 * the guard, and that order is exactly the one a human needs to look at, not a
 * reason to abandon the others.
 */
export const reconcilePendingCheckouts = internalAction({
  args: {
    now: v.optional(v.number()),
    minAgeMinutes: v.optional(v.number()),
    maxAgeHours: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ examined: number; settled: number; failed: number }> => {
    const Stripe = (await import("stripe")).default;
    const { getSiteEnv } = await import("@be-in-digital/core/env");

    const secretKey = getSiteEnv().STRIPE_SECRET_KEY;
    if (!secretKey) {
      // Not an error on a deployment that takes no card payments.
      return { examined: 0, settled: 0, failed: 0 };
    }

    const candidates = await ctx.runQuery(
      internal.payments.internalListStrandedCheckouts,
      {
        now: args.now,
        minAgeMinutes: args.minAgeMinutes,
        maxAgeHours: args.maxAgeHours,
        limit: args.limit,
      }
    );

    if (candidates.length === 0) {
      return { examined: 0, settled: 0, failed: 0 };
    }

    const stripe = new Stripe(secretKey, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    let settled = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const rawSession = await stripe.checkout.sessions.retrieve(
          candidate.checkoutSessionId
        );

        // Unpaid or expired: the customer never completed it. Leave the order
        // alone — an abandoned checkout is not a failed payment, and marking it
        // as one would hide a customer who is about to come back and pay.
        if (rawSession.payment_status !== "paid") continue;

        const orderId = candidate.orderId as Id<"orders">;
        const settlement = readStripeCheckoutSession(rawSession);

        // Same binding as the return page and the webhook: what Stripe reports
        // must equal the order, to the cent, or nothing is marked paid.
        assertSettlesOrder(
          {
            provider: "stripe",
            reference: settlement.reference,
            amountMinor: settlement.amountMinor,
            currency: settlement.currency,
          },
          { orderId, total: candidate.total }
        );

        const order: OrderData | null = await ctx.runQuery(
          internal.orders.internalGetById,
          { id: orderId }
        );
        if (!order) continue;

        const nextPaymentStatus = paymentStatusAfterSettlement(order);
        if (nextPaymentStatus) {
          await ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
            id: orderId,
            paymentStatus: nextPaymentStatus,
          });
        }

        await ctx.runMutation(internal.payments.internalSettle, {
          orderId,
          storeId: candidate.storeId as Id<"stores">,
          amount: candidate.total,
          currency: settlement.currency ?? "EUR",
          provider: "stripe",
          externalId: String(settlement.paymentIntentId ?? rawSession.id),
        });

        settled += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `[Stripe Reconcile] order ${candidate.orderId} (session ${candidate.checkoutSessionId}):`,
          error
        );
      }
    }

    if (settled > 0 || failed > 0) {
      console.log(
        `[Stripe Reconcile] examined ${candidates.length}, settled ${settled}, failed ${failed}`
      );
    }

    return { examined: candidates.length, settled, failed };
  },
});
