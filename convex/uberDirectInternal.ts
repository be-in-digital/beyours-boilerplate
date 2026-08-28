/**
 * Uber Direct — internal mutations
 *
 * The only writers of the Uber Direct fields on an order.
 *
 * NO "use node" — Convex allows nothing but actions in a Node.js module, and
 * uberDirect.ts needs "use node" for the Uber API calls. Defining these there
 * fails the whole push with `InvalidModules`, so they live here instead. Both
 * the actions in uberDirect.ts and the webhook call into this module.
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/** Attach a freshly booked delivery to its order. */
export const recordDelivery = internalMutation({
  args: {
    orderId: v.id("orders"),
    deliveryId: v.string(),
    trackingUrl: v.optional(v.string()),
    fee: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("ORDER_NOT_FOUND");

    await ctx.db.patch(args.orderId, {
      uberDirectDeliveryId: args.deliveryId,
      uberDirectStatus: "SCHEDULED" as const,
      uberDirectStatusAt: Date.now(),
      ...(args.trackingUrl ? { uberDirectTrackingUrl: args.trackingUrl } : {}),
      ...(args.fee !== undefined ? { uberDirectFee: args.fee } : {}),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Apply a courier status to the order it belongs to.
 *
 * Called by the webhook, so it must be idempotent: Uber replays events, and a
 * replay must not throw — a 500 here puts us in a retry loop.
 */
export const applyDeliveryStatus = internalMutation({
  args: {
    deliveryId: v.string(),
    status: v.string(),
    trackingUrl: v.optional(v.string()),
    /** Overrides the status-derived alert. A cancellation we asked for is a
     *  known state, not an incident, and must not raise a flag. */
    needsAttention: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ applied: boolean; reason?: string }> => {
    const { uberDirect } = await import("@be-in-digital/integrations");

    if (!uberDirect.isUberDirectStatus(args.status)) {
      // An unknown status must stall the delivery, not move the order
      // somewhere arbitrary. Recorded as a no-op, not an error.
      console.error(
        `[Uber Direct] Unknown status "${args.status}" for delivery ${args.deliveryId}`
      );
      return { applied: false, reason: "UNKNOWN_STATUS" };
    }

    const order = await ctx.db
      .query("orders")
      .withIndex("by_uberDirectDeliveryId", (q) =>
        q.eq("uberDirectDeliveryId", args.deliveryId)
      )
      .first();

    if (!order) {
      // A delivery we never booked, or one booked by another environment.
      console.error(`[Uber Direct] No order for delivery ${args.deliveryId}`);
      return { applied: false, reason: "ORDER_NOT_FOUND" };
    }

    const now = Date.now();
    const patch: Record<string, unknown> = {
      uberDirectStatus: args.status,
      uberDirectStatusAt: now,
      updatedAt: now,
    };
    if (args.trackingUrl) patch.uberDirectTrackingUrl = args.trackingUrl;
    const needsAttention =
      args.needsAttention ?? uberDirect.requiresManualIntervention(args.status);
    if (needsAttention) {
      patch.uberDirectFailedAt = now;
    }
    await ctx.db.patch(order._id, patch);

    const target = uberDirect.orderStatusForDeliveryStatus(args.status);
    if (!target || order.status === target) {
      return { applied: true };
    }

    // The order machine has the final say. A courier update that would make an
    // illegal move is recorded on the delivery and dropped for the order —
    // an operator who already advanced the order by hand must not be undone.
    const { canTransitionOrderStatus } = await import(
      "@be-in-digital/convex-schema"
    );
    if (!canTransitionOrderStatus(order.status, target)) {
      console.warn(
        `[Uber Direct] ${args.status} would move order ${order.orderNumber} ${order.status} -> ${target}, which the status machine forbids`
      );
      return { applied: true, reason: "TRANSITION_REFUSED" };
    }

    await ctx.db.patch(order._id, { status: target, updatedAt: now });
    return { applied: true };
  },
});
