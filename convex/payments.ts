import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/payments";
import {
  storeQuery,
  storeMutation,
  storeIdFromDocument,
  storeIdFromField,
} from "./lib/storeFunctions";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";
import {
  planRefund,
  routeRefund,
  type PaymentForRefund,
} from "@be-in-digital/convex-functions/refundPolicy";

const paymentsStoreId = storeIdFromDocument("Payment not found");
const payments_getByOrderStoreId = storeIdFromField("orderId", "Order not found");

export const getByOrder = storeQuery({
  permission: "payments:read",
  storeIdFrom: payments_getByOrderStoreId,
  args: defs.getByOrder.args,
  handler: (ctx, args) => defs.getByOrder.handler(ctx, args),
});

export const getByStore = storeQuery({
  permission: "payments:read",
  args: defs.getByStore.args,
  handler: (ctx, args) => defs.getByStore.handler(ctx, args),
});

export const create = storeMutation({
  // Recording a payment is not refunding one. The wrong verb also tied taking
  // money to the right to give it back.
  permission: "payments:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const updateStatus = storeMutation({
  // Same wrong verb as `create`: this moves a payment through its states, it
  // does not refund anything.
  permission: "payments:write",
  storeIdFrom: paymentsStoreId,
  args: defs.updateStatus.args,
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
});

// === Refunds ===
//
// `payments.refund` used to be a mutation that patched `refundedAmount` and
// flipped the status to "refunded" without calling any provider — the money
// never moved. It was also an `authedMutation`, so any authenticated account
// could "refund" any payment of any store.
//
// The public entry point is now an action: it authorises, asks the provider to
// move the money, and only records the refund once the provider confirms.

/**
 * Load a payment for refunding, enforcing store access and `payments:refund`.
 * Internal, but the caller's identity propagates from the action.
 */
export const internalLoadForRefund = internalQuery({
  args: { id: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Paiement introuvable.");
    await requireStorePermission(ctx, payment.storeId, "payments:refund");
    return payment;
  },
});

/** Write down a refund the provider has already confirmed. */
export const internalRecordRefund = internalMutation(defs.recordRefund);
export const internalReserveRefund = internalMutation(defs.reserveRefund);
export const internalConfirmRefund = internalMutation(defs.confirmRefund);
export const internalReleaseRefund = internalMutation(defs.releaseRefund);

/**
 * Refund a payment: authorise, call the provider, then record the outcome.
 *
 * Nothing is written unless the money actually moved — except for cash, which
 * is handed back at the counter and recorded as a manual refund.
 */
// @guarded-inline: internalLoadForRefund requires payments:refund on the payment's store
export const refundPayment = action({
  args: {
    id: v.id("payments"),
    /** Amount in cents. */
    amount: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ refundedAmount: number; isFullRefund: boolean }> => {
    const payment = await ctx.runQuery(internal.payments.internalLoadForRefund, {
      id: args.id,
    });

    const forRefund: PaymentForRefund = {
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      refundedAmount: payment.refundedAmount,
      externalId: payment.externalId,
    };

    // Validate before touching the provider: a refund we would refuse to record
    // must never be sent out either.
    const plan = planRefund({ payment: forRefund, amount: args.amount });
    const route = routeRefund(forRefund);

    if (route.kind === "unsupported") {
      throw new Error(route.reason);
    }

    // Commit the amount FIRST, inside a transaction. The provider call used to
    // come first, so two refunds arriving together both saw an untouched
    // balance and both sent money back. Reserving here is the serialisation
    // point: the second caller reads the first's committed amount and is
    // refused before anything leaves the account.
    const reservation: { plan: { refundedAmount: number; isFullRefund: boolean }; index: number } =
      await ctx.runMutation(internal.payments.internalReserveRefund, {
        id: args.id,
        amount: plan.amount,
        reason: args.reason,
        refundMethod: route.kind === "api" ? "api" : "manual",
      });

    let externalRefundId: string | undefined;

    if (route.kind === "api") {
      try {
        const result: { refundId: string } =
          route.provider === "stripe"
            ? await ctx.runAction(internal.stripe.internalRefund, {
                externalId: route.externalId,
                amount: plan.amount,
                reason: args.reason,
              })
            : route.provider === "sumup"
              ? await ctx.runAction(internal.sumup.internalRefund, {
                  externalId: route.externalId,
                  amount: plan.amount,
                })
              : await ctx.runAction(internal.paypal.internalRefund, {
                  captureId: route.externalId,
                  amount: plan.amount,
                  currency: payment.currency ?? "EUR",
                });

        externalRefundId = result.refundId;
      } catch (error) {
        // The provider refused: give the amount back, or the restaurant could
        // never retry — the balance would claim the money was already returned.
        await ctx.runMutation(internal.payments.internalReleaseRefund, {
          id: args.id,
          index: reservation.index,
        });
        throw error;
      }
    }

    // Record the provider's reference against THIS refund. A scalar field was
    // overwritten by each partial refund, leaving the earlier one with no proof.
    await ctx.runMutation(internal.payments.internalConfirmRefund, {
      id: args.id,
      index: reservation.index,
      externalRefundId,
    });

    return {
      refundedAmount: reservation.plan.refundedAmount,
      isFullRefund: reservation.plan.isFullRefund,
    };
  },
});

// === Internal Mutations (for payment actions and webhooks) ===

/** Create payment record without auth — used by payment verification actions */
export const internalCreate = internalMutation(defs.create);

/** Update payment status without auth — used by webhooks */
export const internalUpdateStatus = internalMutation(defs.updateStatus);
