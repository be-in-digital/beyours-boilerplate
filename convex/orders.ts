import { query, internalMutation, internalQuery, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/orders";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { v } from "convex/values";

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "orders:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

/** The dashboard's aggregates, computed on the server over a window. */
export const dashboardStats = storeQuery({
  permission: "orders:read",
  args: defs.dashboardStats.args,
  handler: (ctx, args) => defs.dashboardStats.handler(ctx, args),
});

/** The dashboard's "Dernières commandes" table — ten rows, ten reads. */
export const recent = storeQuery({
  permission: "orders:read",
  args: defs.recent.args,
  handler: (ctx, args) => defs.recent.handler(ctx, args),
});

/** Get order by ID with access control (view token, the customer, or the store's staff) */
// @guarded-inline: the view token issued at checkout, the customer who placed
// the order, or someone who works at that order's restaurant and holds
// `orders:read` there; otherwise null
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

    /**
     * Access via the staff of the restaurant the order belongs to.
     *
     * The two branches above ask "did you place this order". Nothing asked "do
     * you work here", so the admin's order-detail screen was unreachable for
     * every guest order — which is most of them: a guest carries no
     * `customerId`, checkout stores `session?.user?.id` and that is `undefined`
     * without an account. The screen rendered "Commande introuvable" to the
     * owner of the restaurant.
     *
     * Scoped to THIS order's store, through the same `requireStorePermission`
     * chain every admin function already uses — so staff of one restaurant
     * still cannot read another's. `orders:read` is the permission `list` above
     * already requires, and `list` already returns these very documents whole,
     * so this branch widens the audience of nothing: it lets the same people
     * open one of the orders they can already enumerate.
     */
    if (identity && (await defs.mayReadStoreOrders(ctx, order.storeId))) {
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

// REMOVED: `getByStatus` was `list` with the status filter made mandatory,
// collected whole, and it had no caller. `list` takes an optional `status` and
// pages; a second unbounded doorway onto the same table is not worth keeping.
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

export const MY_ORDERS_LIMIT = 50;

/**
 * The signed-in customer's most recent orders.
 *
 * Bounded rather than collected: this read that customer's entire history with
 * no window and no limit, on a live subscription, and a regular's history has
 * no ceiling of its own. Newest first, because the account page is read from
 * now backwards — an order from two years ago is not what someone opens this
 * screen for.
 */
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
      .take(MY_ORDERS_LIMIT);
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

/**
 * Cash taken at the counter, recorded as a payment.
 *
 * Under `orders:update_status`, not `payments:write`. The people who take cash
 * are the ones who move the order along — the manager at the till and the rider
 * at the door — and `payments:write` belongs to the owner, who is not there
 * when the notes change hands. Recording that a cash order was paid is a step
 * in its lifecycle; refunding it, which does hold `payments:refund`, is not.
 */
export const markCashPaid = storeMutation({
  permission: "orders:update_status",
  args: defs.markCashPaid.args,
  storeIdFrom: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    return order.storeId;
  },
  handler: (ctx, args) => defs.markCashPaid.handler(ctx, args),
});

// Protected: Admin only — verify store access via order's storeId
/**
 * Advance an order, and start the post-order automation if one is waiting.
 *
 * The shared handler decides WHO should be reached — it holds the rule — and
 * returns it; scheduling needs `internal.*`, which only an app has. The same
 * split `emailSubscribers.confirmDoubleOptIn` uses.
 *
 * Scheduled rather than awaited: a thank-you email is not a reason for an order
 * confirmation to fail.
 */
async function advanceOrder(
  ctx: MutationCtx,
  args: Parameters<typeof defs.updateStatus.handler>[1]
) {
  const dispatch = await defs.updateStatus.handler(ctx, args);
  if (dispatch) {
    await ctx.scheduler.runAfter(
      0,
      internal.emailAutomationActions.startPostOrder,
      dispatch as never
    );
  }
}

export const updateStatus = storeMutation({
  // The permission exists precisely for this: advancing an order through its
  // lifecycle. Under `orders:write` the two roles whose entire job is to move
  // an order forward — kitchen and delivery — were refused, while the kitchen
  // display screen offered them the button.
  permission: "orders:update_status",
  args: defs.updateStatus.args,
  storeIdFrom: orderStoreId,
  handler: (ctx, args) => advanceOrder(ctx, args),
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
export const internalUpdateStatus = internalMutation({
  args: defs.updateStatus.args,
  handler: (ctx, args) => advanceOrder(ctx, args),
});

/**
 * Update only paymentStatus — used by payment actions and webhooks.
 *
 * Transport over `defs.recordPaymentStatus`, which is where "a paid order
 * feeds the kitchen" lives. Patching `paymentStatus` here directly is what
 * left the Stripe, PayPal and SumUp paths each responsible for remembering to
 * tell the kitchen, and none of them did.
 *
 * The union comes from the defs layer too, `refund_pending` included: the four
 * provider paths pass whatever `paymentStatusAfterSettlement` returns, and for
 * money arriving against a cancelled order that is `refund_pending`. Restating
 * the union here is how the two would drift.
 */
export const internalUpdatePaymentStatus = internalMutation({
  args: defs.recordPaymentStatus.args,
  handler: (ctx, args) => defs.recordPaymentStatus.handler(ctx, args),
});
