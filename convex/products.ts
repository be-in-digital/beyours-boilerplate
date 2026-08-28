import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/products";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

// @public-by-design: the catalogue IS the storefront. Prices and availability
// are meant to be readable without an account.
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const list = query(defs.list);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getById = query(defs.getById);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getByCategory = query(defs.getByCategory);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getBySlug = query(defs.getBySlug);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getFeatured = query(defs.getFeatured);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getManualTrending = query(defs.getManualTrending);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
export const getTrending = query(defs.getTrending);
// @public-by-design: the catalogue IS the storefront; prices and availability are public
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

/**
 * Copy one restaurant's catalogue into another.
 *
 * Two stores, and the seam can only scope to one — so it scopes to the side
 * that gets WRITTEN. It used to scope to the source, which is the wrong half:
 * the caller proved rights over the restaurant being read while the products
 * and categories landed in a restaurant they might not administer at all. A
 * manager of one store could stuff their catalogue into someone else's.
 *
 * The source is checked in the handler, at `products:read` — copying a
 * competitor's catalogue into your own is the symmetric abuse.
 */
export const duplicateCatalog = storeMutation({
  args: defs.duplicateCatalog.args,
  storeIdFrom: async (_ctx, args) => args.targetStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    await requireStorePermission(ctx, args.sourceStoreId, "products:read");
    return defs.duplicateCatalog.handler(ctx, args);
  },
});

export const setTrendingProducts = storeMutation({
  args: defs.setTrendingProducts.args,
  permission: "products:write",
  handler: (ctx, args) => defs.setTrendingProducts.handler(ctx, args),
});
