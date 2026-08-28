import { query, internalMutation, internalQuery, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/orders";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { v } from "convex/values";

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "orders:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

/** Get order by ID with access control (owner via auth OR view token) */
// @guarded-inline: returns the order only to its owner (session) or to the
// holder of the view token; otherwise null
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

// REMOVED: `getByCustomer` took an arbitrary `customerId` and returned that
// customer's entire order history — names, phones, delivery addresses, items —
// behind nothing but an "are you logged in" check. Any account could read any
// other customer's orders by passing their id.
//
// It had no caller. `getMyOrders` below is what the account page uses, and it
// derives the customer from the session instead of taking it as an argument.

export const getByStatus = storeQuery({
  permission: "orders:read",
  args: defs.getByStatus.args,
  handler: (ctx, args) => defs.getByStatus.handler(ctx, args),
});
// @public-by-design: same rule as `getById` — the view token issued at checkout,
// or the customer who placed the order. Returns one opaque token, nothing else.
export const getTrackingToken = query(defs.getTrackingToken);

// @public-by-design: the post-payment page holds an opaque order id and needs
// to know whether the payment actually landed. Returns the status and the order
// number only — no customer, no address, no amount.
export const getPaymentState = query(defs.getPaymentState);

// @public-by-design: a guest reads their own order with the view token issued
// at checkout. The token is the authorisation.
export const getByViewToken = query(defs.getByViewToken);

/** Get orders for the currently authenticated user (backend deduces user from auth) */
// @guarded-inline: derives the customer from the session; never takes an id
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
// @public-by-design: guest order access is guarded by the view token issued at checkout
export const create = mutation({
  args: defs.createWithTicket.args,
  handler: (ctx, args) => defs.createWithTicket.handler(ctx, args),
});

const orderStoreId = storeIdFromDocument("Order not found");

// Protected: Admin only — verify store access via order's storeId
export const updateStatus = storeMutation({
  // The permission exists precisely for this: advancing an order through its
  // lifecycle. Under `orders:write` the two roles whose entire job is to move
  // an order forward — kitchen and delivery — were refused, while the kitchen
  // display screen offered them the button.
  permission: "orders:update_status",
  args: defs.updateStatus.args,
  storeIdFrom: orderStoreId,
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "orders:delete",
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
