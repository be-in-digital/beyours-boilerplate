import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/products";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

export const list = query(defs.list);
export const getById = query(defs.getById);
export const getByCategory = query(defs.getByCategory);
export const getBySlug = query(defs.getBySlug);
export const getFeatured = query(defs.getFeatured);
export const getManualTrending = query(defs.getManualTrending);
export const getTrending = query(defs.getTrending);
export const getManyByIds = query(defs.getManyByIds);

// === Helpers ===

async function scheduleMenuSync(ctx: MutationCtx) {
  try {
    await ctx.scheduler.runAfter(5000, internal.uberEatsMenuSync.syncAllStores, {});
    await ctx.scheduler.runAfter(5000, internal.deliverooMenuSync.syncAllStores, {});
  } catch (error) {
    console.error("Failed to schedule menu sync:", error);
  }
}

const productStoreId = storeIdFromDocument("Product not found");

/** Resolve storeId from a `productId` arg for authorization */
async function storeIdFromProductId(
  ctx: QueryCtx,
  args: { productId: Id<"products"> }
): Promise<Id<"stores">> {
  const product = await ctx.db.get(args.productId);
  if (!product) throw new Error("Product not found");
  return product.storeId;
}

// === Mutations (with authorization + menu sync) ===

export const create = storeMutation({
  args: defs.create.args,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.create.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const updateStock = storeMutation({
  args: defs.updateStock.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.updateStock.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStatus = storeMutation({
  args: defs.toggleStatus.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStockTracking = storeMutation({
  args: defs.toggleStockTracking.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: (ctx, args) => defs.toggleStockTracking.handler(ctx, args),
});

export const updateAutoDisable = storeMutation({
  args: defs.updateAutoDisable.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: (ctx, args) => defs.updateAutoDisable.handler(ctx, args),
});

export const updateLowStockThreshold = storeMutation({
  args: defs.updateLowStockThreshold.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: (ctx, args) => defs.updateLowStockThreshold.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: productStoreId,
  permission: "products:delete",
  handler: async (ctx, args) => {
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const updateWithPropagation = storeMutation({
  args: defs.updateWithPropagation.args,
  storeIdFrom: storeIdFromProductId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.updateWithPropagation.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const duplicateCatalog = storeMutation({
  args: defs.duplicateCatalog.args,
  storeIdFrom: async (_ctx, args) => args.sourceStoreId,
  permission: "products:write",
  handler: (ctx, args) => defs.duplicateCatalog.handler(ctx, args),
});

export const setTrendingProducts = storeMutation({
  args: defs.setTrendingProducts.args,
  permission: "products:write",
  handler: (ctx, args) => defs.setTrendingProducts.handler(ctx, args),
});
