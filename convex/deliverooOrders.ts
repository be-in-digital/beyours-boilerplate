"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getPackageEnv, getSiteEnv } from "@be-in-digital/core/env";

/**
 * Accept a Deliveroo order.
 *
 * Calls the Deliveroo API to accept the order and updates the internal order status.
 */
// @guarded-inline: checks orders:update_status on the order's own store
export const acceptOrder = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      // 1. Get the order
      // `api.orders.getById` only answers the customer who placed the order or
      // the holder of its view token — never staff. These three actions were
      // therefore dead: they always fell through to "Order not found". Read the
      // order on the staff path, then check the caller works this restaurant.
      const order = await ctx.runQuery(internal.orders.internalGetById, { id: args.orderId }) as {
        _id: string
        storeId: Id<"stores">
        source?: string
        externalOrderId?: string
        status: string
      } | null;

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      await ctx.runQuery(internal.authHelpers.checkStorePermission, {
        storeId: order.storeId,
        permission: "orders:update_status",
      });

      // 2. Verify source is deliveroo
      if (order.source !== "deliveroo") {
        return { success: false, error: `Order source is ${order.source}, not deliveroo` };
      }

      if (!order.externalOrderId) {
        return { success: false, error: "Order has no externalOrderId" };
      }

      // 3. Get credentials from env
      const pkg = getPackageEnv();
      const site = getSiteEnv();
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";

      if (!clientId || !clientSecret) {
        return { success: false, error: "Deliveroo API credentials not configured" };
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      // 4. Call Deliveroo API to accept order
      const { deliveroo } = await import("@be-in-digital/integrations");
      await deliveroo.acceptOrder(credentials, order.externalOrderId);

      // 5. Update order status to confirmed
      await ctx.runMutation(api.orders.updateStatus, {
        id: args.orderId,
        status: "confirmed",
      });

      console.log(`Accepted Deliveroo order ${order.externalOrderId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to accept Deliveroo order:`, errorMessage);
      return { success: false, error: "Failed to accept Deliveroo order" };
    }
  },
});

/**
 * Reject a Deliveroo order.
 *
 * Calls the Deliveroo API to reject the order and updates the internal order status.
 */
// @guarded-inline: checks orders:update_status on the order's own store
export const rejectOrder = action({
  args: {
    orderId: v.id("orders"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      // 1. Get the order
      // `api.orders.getById` only answers the customer who placed the order or
      // the holder of its view token — never staff. These three actions were
      // therefore dead: they always fell through to "Order not found". Read the
      // order on the staff path, then check the caller works this restaurant.
      const order = await ctx.runQuery(internal.orders.internalGetById, { id: args.orderId }) as {
        _id: string
        storeId: Id<"stores">
        source?: string
        externalOrderId?: string
        status: string
      } | null;

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      await ctx.runQuery(internal.authHelpers.checkStorePermission, {
        storeId: order.storeId,
        permission: "orders:update_status",
      });

      // 2. Verify source is deliveroo
      if (order.source !== "deliveroo") {
        return { success: false, error: `Order source is ${order.source}, not deliveroo` };
      }

      if (!order.externalOrderId) {
        return { success: false, error: "Order has no externalOrderId" };
      }

      // 3. Get credentials from env
      const pkg = getPackageEnv();
      const site = getSiteEnv();
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";

      if (!clientId || !clientSecret) {
        return { success: false, error: "Deliveroo API credentials not configured" };
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      // 4. Call Deliveroo API to reject order
      const { deliveroo } = await import("@be-in-digital/integrations");
      await deliveroo.rejectOrder(credentials, order.externalOrderId, args.reason ?? "store_busy");

      // 5. Update order status to cancelled
      await ctx.runMutation(api.orders.updateStatus, {
        id: args.orderId,
        status: "cancelled",
        cancellationReason: args.reason,
      });

      console.log(`Rejected Deliveroo order ${order.externalOrderId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to reject Deliveroo order:`, errorMessage);
      return { success: false, error: "Failed to reject Deliveroo order" };
    }
  },
});

/**
 * Update preparation stage for a Deliveroo order.
 *
 * Calls the Deliveroo API to update the prep stage and updates the internal order status.
 */
// @guarded-inline: checks orders:update_status on the order's own store
export const updatePrepStage = action({
  args: {
    orderId: v.id("orders"),
    stage: v.union(v.literal("in_kitchen"), v.literal("ready")),
  },
  handler: async (ctx, args) => {
    // Auth check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      // 1. Get the order
      // `api.orders.getById` only answers the customer who placed the order or
      // the holder of its view token — never staff. These three actions were
      // therefore dead: they always fell through to "Order not found". Read the
      // order on the staff path, then check the caller works this restaurant.
      const order = await ctx.runQuery(internal.orders.internalGetById, { id: args.orderId }) as {
        _id: string
        storeId: Id<"stores">
        source?: string
        externalOrderId?: string
        status: string
      } | null;

      if (!order) {
        return { success: false, error: "Order not found" };
      }

      await ctx.runQuery(internal.authHelpers.checkStorePermission, {
        storeId: order.storeId,
        permission: "orders:update_status",
      });

      // 2. Verify source is deliveroo
      if (order.source !== "deliveroo") {
        return { success: false, error: `Order source is ${order.source}, not deliveroo` };
      }

      if (!order.externalOrderId) {
        return { success: false, error: "Order has no externalOrderId" };
      }

      // 3. Get credentials from env
      const pkg = getPackageEnv();
      const site = getSiteEnv();
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";

      if (!clientId || !clientSecret) {
        return { success: false, error: "Deliveroo API credentials not configured" };
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      // 4. Call Deliveroo API to update prep stage
      const { deliveroo } = await import("@be-in-digital/integrations");
      await deliveroo.updatePrepStage(credentials, order.externalOrderId, args.stage);

      // 5. Update internal order status based on stage
      const newStatus = args.stage === "in_kitchen" ? "preparing" : "ready";
      await ctx.runMutation(api.orders.updateStatus, {
        id: args.orderId,
        status: newStatus,
      });

      console.log(`Updated Deliveroo order ${order.externalOrderId} prep stage to ${args.stage}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to update Deliveroo order prep stage:`, errorMessage);
      return { success: false, error: "Failed to update Deliveroo order preparation stage" };
    }
  },
});
