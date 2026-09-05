import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  documentsForOrder,
  issueInvoiceForOrder,
} from "@be-in-digital/convex-functions/invoices";
import { mayReadStoreOrders } from "@be-in-digital/convex-functions/orders";
import { storeQuery, storeMutation } from "./lib/storeFunctions";

/**
 * Invoices — *factures* — and the credit notes that reverse them.
 *
 * Issuing happens on the payment seam in the defs layer, not here; these are
 * the ways a document is read back, plus one way to issue an invoice by hand
 * for an order that has none.
 */

/**
 * Every document issued against one order.
 *
 * Reachable by the diner who placed the order — through the view token issued
 * at checkout, or as the signed-in customer — and by the staff of the
 * establishment that sold it. Exactly the access `orders.getById` grants,
 * because an invoice says nothing the order does not already say to the same
 * people, and a customer who cannot fetch their own invoice does not have one.
 */
// @guarded-inline: the view token issued at checkout, the customer who placed
// the order, or someone who works at that order's restaurant and holds
// `orders:read` there; otherwise an empty list
export const forOrder = query({
  args: {
    orderId: v.id("orders"),
    viewToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return [];

    const byToken = Boolean(args.viewToken) && order.viewToken === args.viewToken;
    const identity = await ctx.auth.getUserIdentity();
    const byCustomer = Boolean(identity) && order.customerId === identity?.subject;
    const byStaff =
      Boolean(identity) && (await mayReadStoreOrders(ctx, order.storeId));

    if (!byToken && !byCustomer && !byStaff) return [];

    return await documentsForOrder(ctx, args.orderId);
  },
});

/**
 * The establishment's own invoices, newest first.
 *
 * Under `payments:read` rather than a permission of its own: an invoice states
 * what was charged and to whom, which is the same disclosure the payments
 * screen already makes, and the kitchen and delivery roles that hold
 * `orders:read` must not see it. Reusing the existing permission is the tighter
 * choice as well as the smaller one.
 */
export const listByStore = storeQuery({
  permission: "payments:read",
  args: {
    storeId: v.id("stores"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_storeId_issuedAt", (q) => q.eq("storeId", args.storeId))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
  },
});

/**
 * Issue the invoice for a paid order that has none.
 *
 * Every order paid from now on is invoiced on the payment seam. This exists for
 * the two cases that seam cannot reach: orders paid before invoicing shipped,
 * and orders that settled while `globalSettings.seller` was still incomplete —
 * which is every establishment until its owner fills the block in.
 *
 * Idempotent, and it refuses for the same reasons the automatic path does; the
 * result names the reason so the screen can say why rather than fail silently.
 */
export const issueForOrder = storeMutation({
  permission: "payments:write",
  args: { orderId: v.id("orders") },
  // `storeIdFromDocument` reads `args.id`; this one is keyed on `orderId`.
  storeIdFrom: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    return order.storeId;
  },
  handler: (ctx, args) => issueInvoiceForOrder(ctx, args.orderId),
});
