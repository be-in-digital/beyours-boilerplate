import { v } from "convex/values";
import {
  issueInvoiceForOrder,
} from "@be-in-digital/convex-functions/invoices";
import { storeMutation } from "./lib/storeFunctions";

/**
 * Invoices — *factures* — and the credit notes that reverse them.
 *
 * Issuing happens on the payment seam in the defs layer, not here; these are
 * the ways a document is read back, plus one way to issue an invoice by hand
 * for an order that has none.
 */

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
