import { query, internalMutation, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/kitchenTickets";
import { storeQuery, storeMutation, storeIdFromDocument, storeIdFromField } from "./lib/storeFunctions";

const kitchenTicketsStoreId = storeIdFromDocument("Ticket not found");
const kitchenTickets_getByOrderStoreId = storeIdFromField("orderId", "Order not found");

// === INTERNAL QUERIES (no auth, called from actions) ===

export const internalGetById = internalQuery({
  args: { id: v.id("kitchenTickets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const internalGetOrder = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orderId);
  },
});

// === INTERNAL MUTATIONS (no auth, called from webhooks/internal actions) ===

export const internalCreate = internalMutation(defs.create);

export const internalMarkPickedUp = internalMutation({
  args: { id: v.id("kitchenTickets") },
  handler: async (ctx, args) => {
    return defs.markPickedUp.handler(ctx, args);
  },
});

export const internalUpdateStatus = internalMutation({
  args: {
    id: v.id("kitchenTickets"),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("ready"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    return defs.updateStatus.handler(ctx, args);
  },
});

// === QUERIES ===

export const getByStore = storeQuery({
  permission: "kitchen:read",
  args: defs.getByStore.args,
  handler: (ctx, args) => defs.getByStore.handler(ctx, args),
});
export const getByStatus = storeQuery({
  permission: "kitchen:read",
  args: defs.getByStatus.args,
  handler: (ctx, args) => defs.getByStatus.handler(ctx, args),
});

export const getByStation = storeQuery({
  permission: "kitchen:read",
  args: defs.getByStation.args,
  handler: (ctx, args) => defs.getByStation.handler(ctx, args),
});

export const getByOrder = storeQuery({
  permission: "kitchen:read",
  storeIdFrom: kitchenTickets_getByOrderStoreId,
  args: defs.getByOrder.args,
  handler: (ctx, args) => defs.getByOrder.handler(ctx, args),
});

export const getPrintQueue = storeQuery({
  permission: "kitchen:read",
  args: defs.getPrintQueue.args,
  handler: (ctx, args) => defs.getPrintQueue.handler(ctx, args),
});

export const getOverdueCount = storeQuery({
  permission: "kitchen:read",
  args: defs.getOverdueCount.args,
  handler: (ctx, args) => defs.getOverdueCount.handler(ctx, args),
});

export const getPrintStuckCount = storeQuery({
  permission: "kitchen:read",
  args: defs.getPrintStuckCount.args,
  handler: (ctx, args) => defs.getPrintStuckCount.handler(ctx, args),
});

export const getForDisplay = storeQuery({
  permission: "kitchen:read",
  args: defs.getForDisplay.args,
  handler: (ctx, args) => defs.getForDisplay.handler(ctx, args),
});

// Public: token-based access for customer order tracking
// @public-by-design: order tracking by opaque token. The payload carries
// preparation state only — no customer details.
export const getByTrackingToken = query(defs.getByTrackingToken);

// === MUTATIONS (authenticated) ===

export const create = storeMutation({
  permission: "kitchen:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const updateStatus = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.updateStatus.args,
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
});

export const markPickedUp = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.markPickedUp.args,
  handler: (ctx, args) => defs.markPickedUp.handler(ctx, args),
});

// Taking a ticket is a kitchen write, and it must be reachable by whichever
// tablet is watching the queue — the claim is the thing that stops two of them
// printing the same slip.
export const claimForPrint = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.claimForPrint.args,
  handler: (ctx, args) => defs.claimForPrint.handler(ctx, args),
});

export const markPrintSent = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.markPrintSent.args,
  handler: (ctx, args) => defs.markPrintSent.handler(ctx, args),
});

export const markPrintFailed = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.markPrintFailed.args,
  handler: (ctx, args) => defs.markPrintFailed.handler(ctx, args),
});

export const requestReprint = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.requestReprint.args,
  handler: (ctx, args) => defs.requestReprint.handler(ctx, args),
});

export const assignStation = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.assignStation.args,
  handler: (ctx, args) => defs.assignStation.handler(ctx, args),
});

export const assignTo = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.assignTo.args,
  handler: (ctx, args) => defs.assignTo.handler(ctx, args),
});

/** @deprecated Use markPrintSent instead */
export const incrementPrintCount = storeMutation({
  permission: "kitchen:write",
  storeIdFrom: kitchenTicketsStoreId,
  args: defs.incrementPrintCount.args,
  handler: (ctx, args) => defs.incrementPrintCount.handler(ctx, args),
});

// === ACTIONS (authenticated, can call external APIs) ===

/**
 * Helper: get Uber Eats credentials from env vars.
 */
async function getUberEatsCredentials() {
  const { getPackageEnv, isSandbox } = await import("@be-in-digital/core/env");
  const pkg = getPackageEnv();
  const clientId = pkg.UBER_EATS_CLIENT_ID;
  const clientSecret = pkg.UBER_EATS_CLIENT_SECRET;
  const sandboxMode = isSandbox("uberEats");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sandboxMode };
}

/**
 * Helper: get Deliveroo credentials from env vars.
 */
async function getDeliverooCredentials() {
  const { getPackageEnv, isSandbox } = await import("@be-in-digital/core/env");
  const pkg = getPackageEnv();
  const clientId = pkg.DELIVEROO_CLIENT_ID;
  const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
  const sandboxMode = isSandbox("deliveroo");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sandboxMode };
}

/**
 * Accept a kitchen ticket: update status + notify platform (Uber Eats / Deliveroo).
 */
// @guarded-inline: checks kitchen:write on the ticket's own store
export const acceptTicket = action({
  args: { id: v.id("kitchenTickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ticket = await ctx.runQuery(internal.kitchenTickets.internalGetById, { id: args.id });
    if (!ticket) throw new Error("Kitchen ticket not found");

    // The ticket carries the restaurant; check the caller may work its kitchen.
    // Being logged in was the only requirement before, so any customer account
    // could accept, ready, complete or cancel tickets in any restaurant.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: ticket.storeId,
      permission: "kitchen:write",
    });

    // 1. Update ticket status to in_progress
    await ctx.runMutation(internal.kitchenTickets.internalUpdateStatus, {
      id: args.id,
      status: "in_progress",
    });

    // 2. Update order status to confirmed
    try {
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: ticket.orderId,
        status: "confirmed",
      });
    } catch (error) {
      console.error("Failed to confirm order:", error);
    }

    // 3. Notify platform
    const order = await ctx.runQuery(internal.kitchenTickets.internalGetOrder, { orderId: ticket.orderId });
    const externalId = order?.externalOrderId;
    if (!externalId) return;

    if (ticket.source === "uber_eats") {
      try {
        const creds = await getUberEatsCredentials();
        if (creds) {
          const { uberEats } = await import("@be-in-digital/integrations");
          await uberEats.acceptOrder(creds, externalId);
          console.log(`Accepted Uber Eats order ${externalId}`);
        }
      } catch (error) {
        console.error("Failed to accept order on Uber Eats:", error);
      }
    }

    if (ticket.source === "deliveroo") {
      try {
        const creds = await getDeliverooCredentials();
        if (creds) {
          const { deliveroo } = await import("@be-in-digital/integrations");
          await deliveroo.acceptOrder(creds, externalId);
          console.log(`Accepted Deliveroo order ${externalId}`);
        }
      } catch (error) {
        console.error("Failed to accept order on Deliveroo:", error);
      }
    }
  },
});

/**
 * Mark a kitchen ticket as ready: update ticket + order status + notify platform.
 * - Deliveroo: POST /order/v2/orders/{id}/prep_stage { stage: "ready" }
 * - Uber Eats: POST /v1/eats/orders/{id}/mark_order_as_ready_for_pickup
 */
// @guarded-inline: checks kitchen:write on the ticket's own store
export const readyTicket = action({
  args: { id: v.id("kitchenTickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ticket = await ctx.runQuery(internal.kitchenTickets.internalGetById, { id: args.id });
    if (!ticket) throw new Error("Kitchen ticket not found");

    // The ticket carries the restaurant; check the caller may work its kitchen.
    // Being logged in was the only requirement before, so any customer account
    // could accept, ready, complete or cancel tickets in any restaurant.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: ticket.storeId,
      permission: "kitchen:write",
    });

    // 1. Update ticket status to ready
    await ctx.runMutation(internal.kitchenTickets.internalUpdateStatus, {
      id: args.id,
      status: "ready",
    });

    // 2. Update order status to ready
    try {
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: ticket.orderId,
        status: "ready",
      });
    } catch (error) {
      console.error("Failed to update order to ready:", error);
    }

    // 3. Notify platform
    const order = await ctx.runQuery(internal.kitchenTickets.internalGetOrder, { orderId: ticket.orderId });
    const externalId = order?.externalOrderId;

    if (ticket.source === "deliveroo" && externalId) {
      try {
        const creds = await getDeliverooCredentials();
        if (creds) {
          const { deliveroo } = await import("@be-in-digital/integrations");
          await deliveroo.updatePrepStage(creds, externalId, "ready");
          console.log(`Deliveroo order ${externalId} marked as ready`);
        }
      } catch (error) {
        console.error("Failed to update Deliveroo prep stage:", error);
      }
    } else if (ticket.source === "uber_eats" && externalId) {
      try {
        const { getPackageEnv, isSandbox } = await import("@be-in-digital/core/env");
        const pkg = getPackageEnv();
        if (pkg.UBER_EATS_CLIENT_ID && pkg.UBER_EATS_CLIENT_SECRET) {
          const { uberEats } = await import("@be-in-digital/integrations");
          await uberEats.markOrderAsReady(
            {
              clientId: pkg.UBER_EATS_CLIENT_ID,
              clientSecret: pkg.UBER_EATS_CLIENT_SECRET,
              sandboxMode: isSandbox("uberEats"),
            },
            externalId
          );
          console.log(`Uber Eats order ${externalId} marked as ready`);
        }
      } catch (error) {
        console.error("Failed to mark Uber Eats order as ready:", error);
      }
    }

    console.log(`Ticket ${ticket.orderNumber} marked as ready (source: ${ticket.source})`);
  },
});

/**
 * Mark a kitchen ticket as completed (picked up by driver/customer).
 * Updates ticket + order status. Pickup is tracked by the driver's app on platforms.
 */
// @guarded-inline: checks kitchen:write on the ticket's own store
export const completeTicket = action({
  args: { id: v.id("kitchenTickets") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ticket = await ctx.runQuery(internal.kitchenTickets.internalGetById, { id: args.id });
    if (!ticket) throw new Error("Kitchen ticket not found");

    // The ticket carries the restaurant; check the caller may work its kitchen.
    // Being logged in was the only requirement before, so any customer account
    // could accept, ready, complete or cancel tickets in any restaurant.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: ticket.storeId,
      permission: "kitchen:write",
    });

    // 1. Mark picked up
    try {
      await ctx.runMutation(internal.kitchenTickets.internalMarkPickedUp, { id: args.id });
    } catch (error) {
      console.error("Failed to mark picked up:", error);
    }

    // 2. Update ticket status to completed
    await ctx.runMutation(internal.kitchenTickets.internalUpdateStatus, {
      id: args.id,
      status: "completed",
    });

    // 3. Update order status
    try {
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: ticket.orderId,
        status: ticket.orderType === "delivery" ? "out_for_delivery" : "completed",
      });
    } catch (error) {
      console.error("Failed to update order status:", error);
    }

    console.log(`Ticket ${ticket.orderNumber} completed (source: ${ticket.source})`);
  },
});

/**
 * Cancel a kitchen ticket + its order, and notify the platform.
 *
 * Platform behavior:
 * - Uber Eats: deny (pre-accept) or cancel (post-accept). Refund is automatic.
 * - Deliveroo: reject (pre-accept only). Post-accept cancel not available via API.
 * - Website: orders.internalUpdateStatus already marks payments as refunded at DB level.
 */
// @guarded-inline: checks kitchen:write on the ticket's own store
export const cancelTicket = action({
  args: {
    id: v.id("kitchenTickets"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const ticket = await ctx.runQuery(internal.kitchenTickets.internalGetById, { id: args.id });
    if (!ticket) throw new Error("Kitchen ticket not found");

    // The ticket carries the restaurant; check the caller may work its kitchen.
    // Being logged in was the only requirement before, so any customer account
    // could accept, ready, complete or cancel tickets in any restaurant.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: ticket.storeId,
      permission: "kitchen:write",
    });

    const wasAccepted = ticket.status !== "pending";
    const cancelReason = args.reason ?? "Commande annulée par le restaurant";

    // 1. Cancel the kitchen ticket
    await ctx.runMutation(internal.kitchenTickets.internalUpdateStatus, {
      id: args.id,
      status: "cancelled",
    });

    // 2. Cancel the order (also handles DB-level refund for website payments)
    try {
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: ticket.orderId,
        status: "cancelled",
      });
    } catch (error) {
      console.error("Failed to cancel order:", error);
    }

    // 3. Notify platform
    const order = await ctx.runQuery(internal.kitchenTickets.internalGetOrder, { orderId: ticket.orderId });
    const externalId = order?.externalOrderId;
    if (!externalId) return;

    if (ticket.source === "uber_eats") {
      try {
        const creds = await getUberEatsCredentials();
        if (creds) {
          const { uberEats } = await import("@be-in-digital/integrations");
          if (wasAccepted) {
            // Post-accept: use cancelOrder (refund handled by Uber)
            await uberEats.cancelOrder(creds, externalId, {
              explanation: cancelReason,
              code: "OTHER",
            });
            console.log(`Cancelled Uber Eats order ${externalId} (post-accept)`);
          } else {
            // Pre-accept: use denyOrder
            await uberEats.denyOrder(creds, externalId, {
              explanation: cancelReason,
              code: "OTHER",
            });
            console.log(`Denied Uber Eats order ${externalId} (pre-accept)`);
          }
        }
      } catch (error) {
        console.error("Failed to cancel/deny order on Uber Eats:", error);
      }
    }

    if (ticket.source === "deliveroo") {
      try {
        const creds = await getDeliverooCredentials();
        if (creds) {
          const { deliveroo } = await import("@be-in-digital/integrations");
          if (!wasAccepted) {
            // Pre-accept: reject via API with reason from KDS
            const rejectReason = args.reason ?? "store_busy";
            await deliveroo.rejectOrder(creds, externalId, rejectReason);
            console.log(`Rejected Deliveroo order ${externalId} (pre-accept, reason: ${rejectReason})`);
          } else {
            // Post-accept: no API available — cancelled internally only
            console.log(`Deliveroo order ${externalId} cancelled internally (post-accept cancel not available via API)`);
          }
        }
      } catch (error) {
        console.error("Failed to reject order on Deliveroo:", error);
      }
    }
  },
});

// === RETENTION (cron) ===

/**
 * Delete finished tickets past the retention window.
 *
 * Scheduled nightly from `crons.ts`; internal because a sweep runs with no user
 * identity. One batch per call, and it queues the next one itself while there
 * is more to delete — a single nightly batch would take months to drain a
 * deployment that turns retention on with a year of history behind it, and
 * would never catch up with the day's own orders.
 *
 * A minute apart, so a large backlog drains without monopolising the backend
 * during service.
 */
export const purgeExpiredTickets = internalMutation({
  args: defs.purgeExpiredTickets.args,
  handler: async (ctx, args) => {
    const result = await defs.purgeExpiredTickets.handler(ctx, args);

    if (result.hasMore) {
      await ctx.scheduler.runAfter(
        60_000,
        internal.kitchenTickets.purgeExpiredTickets,
        args,
      );
    }

    return result;
  },
});
