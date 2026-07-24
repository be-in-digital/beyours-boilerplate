import { query, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/promotions";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

export const list = query(defs.list);
export const getById = query(defs.getById);
export const getByCouponCode = query(defs.getByCouponCode);
export const listActiveAuto = query(defs.listActiveAuto);
export const getCustomerUsageCount = query(defs.getCustomerUsageCount);

// === Mutations (protected) ===

const promotionStoreId = storeIdFromDocument("Promotion not found");

export const create = storeMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const toggleStatus = storeMutation({
  args: defs.toggleStatus.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.toggleStatus.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

// === Internal Mutations (for checkout flow) ===

export const incrementUsage = internalMutation(defs.incrementUsage);
