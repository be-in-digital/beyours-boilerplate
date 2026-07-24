import { query, internalMutation, internalQuery, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/orders";
import { storeQuery, storeMutation, storeIdFromDocument, authedQuery } from "./lib/storeFunctions";
import { v } from "convex/values";

// === Queries (auth-protected) ===

export const list = storeQuery({
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

/** Get order by ID with access control (owner via auth OR view token) */
export const getById = query({
  args: {
    id: v.id("orders"),
    viewToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Access via view token
    if (args.viewToken && order.viewToken === args.viewToken) {
      return order;
    }

    // Access via authenticated owner
    const identity = await ctx.auth.getUserIdentity();
    if (identity && order.customerId === identity.subject) {
      return order;
    }

    // No access
    return null;
  },
});

export const getByCustomer = authedQuery({
  args: defs.getByCustomer.args,
  handler: (ctx, args) => defs.getByCustomer.handler(ctx, args),
});

export const getByStatus = storeQuery({
  args: defs.getByStatus.args,
  handler: (ctx, args) => defs.getByStatus.handler(ctx, args),
});
export const getByViewToken = query(defs.getByViewToken);

/** Get orders for the currently authenticated user (backend deduces user from auth) */
export const getMyOrders = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("orders")
      .withIndex("by_customerId", (q) => q.eq("customerId", identity.subject))
      .order("desc")
      .collect();
  },
});

// === Mutations ===

/**
 * Storefront checkout: the order + kitchen-ticket invariant lives in the
 * defs layer (defs.createWithTicket) — this wrapper is transport only.
 */
export const create = mutation({
  args: defs.createWithTicket.args,
  handler: (ctx, args) => defs.createWithTicket.handler(ctx, args),
});

const orderStoreId = storeIdFromDocument("Order not found");

// Protected: Admin only — verify store access via order's storeId
export const updateStatus = storeMutation({
  args: defs.updateStatus.args,
  storeIdFrom: orderStoreId,
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: orderStoreId,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

// === Internal Queries (for payment actions) ===

/** Get order by ID without auth — used by Stripe/PayPal/SumUp actions */
export const internalGetById = internalQuery({
  args: { id: v.id("orders") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

// === Internal Mutations (for webhooks and schedulers) ===

export const createFromWebhook = internalMutation(defs.createFromWebhook);
export const updateFromWebhook = internalMutation(defs.updateFromWebhook);

// Internal version of updateStatus for webhooks/schedulers
export const internalUpdateStatus = internalMutation(defs.updateStatus);

/** Update only paymentStatus — used by payment actions and webhooks */
export const internalUpdatePaymentStatus = internalMutation({
  args: {
    id: v.id("orders"),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded"),
      v.literal("partially_refunded")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      paymentStatus: args.paymentStatus,
      updatedAt: Date.now(),
    });
  },
});
