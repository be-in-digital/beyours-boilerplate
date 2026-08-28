import { query, internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/promotions";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries ===

// PUBLIC BY DESIGN — the storefront applies a coupon and displays automatic
// offers before the customer has any account.
// @public-by-design: a coupon is applied before the customer has an account
export const getByCouponCode = query(defs.getByCouponCode);
// @public-by-design: a coupon is applied before the customer has an account
export const listActiveAuto = query(defs.listActiveAuto);

// Admin surface: `list` returns every promotion of a store, inactive and
// expired ones included, along with their usage counts. It was public.
export const list = storeQuery({
  permission: "marketing:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = storeQuery({
  permission: "marketing:read",
  args: defs.getById.args,
  storeIdFrom: storeIdFromDocument("Promotion not found"),
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

// Answers "has this email already used this promotion?" — a membership probe on
// an arbitrary address, and it had no caller at all outside the server.
export const internalGetCustomerUsageCount = internalQuery(
  defs.getCustomerUsageCount
);

// === Mutations (protected) ===

const promotionStoreId = storeIdFromDocument("Promotion not found");

export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  permission: "marketing:write",
  args: defs.update.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const toggleStatus = storeMutation({
  permission: "marketing:write",
  args: defs.toggleStatus.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.toggleStatus.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "marketing:write",
  args: defs.remove.args,
  storeIdFrom: promotionStoreId,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

// === Internal Mutations (for checkout flow) ===

export const incrementUsage = internalMutation(defs.incrementUsage);
