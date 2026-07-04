import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/products";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";

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

/** Resolve storeId from a product ID for authorization */
async function getProductStoreId(ctx: MutationCtx, productId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const product = await (ctx.db as any).get(productId);
  if (!product) throw new Error("Product not found");
  return product.storeId;
}

// === Mutations (with authorization + menu sync) ===

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    await requireStorePermission(ctx, args.storeId, "products:write");
    const result = await defs.create.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const updateStock = mutation({
  args: defs.updateStock.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    const result = await defs.updateStock.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStatus = mutation({
  args: defs.toggleStatus.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStockTracking = mutation({
  args: defs.toggleStockTracking.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    return defs.toggleStockTracking.handler(ctx, args);
  },
});

export const updateAutoDisable = mutation({
  args: defs.updateAutoDisable.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    return defs.updateAutoDisable.handler(ctx, args);
  },
});

export const updateLowStockThreshold = mutation({
  args: defs.updateLowStockThreshold.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:write");
    return defs.updateLowStockThreshold.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.id);
    await requireStorePermission(ctx, storeId, "products:delete");
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const updateWithPropagation = mutation({
  args: defs.updateWithPropagation.args,
  handler: async (ctx, args) => {
    const storeId = await getProductStoreId(ctx, args.productId);
    await requireStorePermission(ctx, storeId, "products:write");
    const result = await defs.updateWithPropagation.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const duplicateCatalog = mutation({
  args: defs.duplicateCatalog.args,
  handler: async (ctx, args) => {
    await requireStorePermission(ctx, args.sourceStoreId, "products:write");
    return defs.duplicateCatalog.handler(ctx, args);
  },
});

export const setTrendingProducts = mutation({
  args: defs.setTrendingProducts.args,
  handler: async (ctx, args) => {
    await requireStorePermission(ctx, args.storeId, "products:write");
    return defs.setTrendingProducts.handler(ctx, args);
  },
});
