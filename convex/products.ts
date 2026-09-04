import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/products";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";
import { claimMenuSyncWindow } from "@be-in-digital/convex-functions/rateLimit";
import { touchesTranslatableText } from "@be-in-digital/convex-functions/autoTranslate";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { scheduleTranslation } from "./autoTranslate";

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

/**
 * Book the platform menu push for the establishments this write touched.
 *
 * Two things were wrong here, and they multiplied. Every mutation queued
 * `syncAllStores` — for both platforms, unconditionally — and Convex does not
 * dedupe scheduled jobs, so a fifty-product import queued a hundred sweeps.
 * Each of those sweeps then pushed the menu of **every** establishment on the
 * deployment, including the ones nobody had touched. Fifty edits in one
 * restaurant meant a hundred full uploads per restaurant on the account, at an
 * endpoint Uber rate-limits to about one call a minute per store.
 *
 * Now: one claim per (platform, establishment) per window, and the push is
 * scoped to the store that actually changed. Everything behind the first edit
 * of a window rides on the upload it already booked — a menu upload is a full
 * overwrite, so the single push at the end of the window carries the burst's
 * final state.
 *
 * Failures stay non-fatal, as before: a catalogue write must not be refused
 * because its platform push could not be booked.
 */
async function scheduleMenuSync(ctx: MutationCtx, storeIds: Array<Id<"stores">>) {
  for (const storeId of Array.from(new Set(storeIds))) {
    try {
      const uberEats = await claimMenuSyncWindow(ctx, "uberEats", storeId);
      if (uberEats.claimed) {
        await ctx.scheduler.runAt(
          uberEats.runAt,
          internal.uberEatsMenuSync.internalSyncStore,
          { storeId }
        );
      }

      const deliveroo = await claimMenuSyncWindow(ctx, "deliveroo", storeId);
      if (deliveroo.claimed) {
        await ctx.scheduler.runAt(
          deliveroo.runAt,
          internal.deliverooMenuSync.internalSyncStore,
          { storeId }
        );
      }
    } catch (error) {
      console.error("Failed to schedule menu sync:", error);
    }
  }
}

/**
 * The establishment a product belongs to.
 *
 * Called a second time inside the mutations below, deliberately: the seam
 * resolves it for the permission check but does not hand it to the handler, and
 * `remove` deletes the very document the resolver reads — so the store has to be
 * read BEFORE the handler runs, not after.
 */
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
    await scheduleMenuSync(ctx, [args.storeId]);
    // A new dish always carries a name, so there is always something to
    // translate for whatever second language the store has switched on.
    await scheduleTranslation(ctx, result, "products", args.storeId);
    return result;
  },
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const storeId = await productStoreId(ctx, args);
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx, [storeId]);
    if (touchesTranslatableText(args)) {
      await scheduleTranslation(ctx, args.id, "products", storeId);
    }
    return result;
  },
});

export const updateStock = storeMutation({
  args: defs.updateStock.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const storeId = await productStoreId(ctx, args);
    const result = await defs.updateStock.handler(ctx, args);
    await scheduleMenuSync(ctx, [storeId]);
    return result;
  },
});

export const toggleStatus = storeMutation({
  args: defs.toggleStatus.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const storeId = await productStoreId(ctx, args);
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx, [storeId]);
    return result;
  },
});

// Turning tracking on for a product already sitting at zero makes it sold out;
// turning it off makes it sellable again. Both change what the delivery
// platforms should be showing, so this has to push like `updateStock` does —
// it was the one stock control that changed availability and told nobody.
export const toggleStockTracking = storeMutation({
  args: defs.toggleStockTracking.args,
  storeIdFrom: productStoreId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const storeId = await productStoreId(ctx, args);
    const result = await defs.toggleStockTracking.handler(ctx, args);
    await scheduleMenuSync(ctx, [storeId]);
    return result;
  },
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
    const storeId = await productStoreId(ctx, args);
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx, [storeId]);
    return result;
  },
});

export const updateWithPropagation = storeMutation({
  args: defs.updateWithPropagation.args,
  storeIdFrom: storeIdFromProductId,
  permission: "products:write",
  handler: async (ctx, args) => {
    const result = await defs.updateWithPropagation.handler(ctx, args);
    // The one write that can change several establishments at once; the handler
    // reports which, so every twin's menu is pushed and no other store's is.
    await scheduleMenuSync(ctx, result.storeIds as Array<Id<"stores">>);
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

/**
 * Reorder the catalogue of one establishment.
 *
 * Scoped on `args.storeId` like every other write here; the handler refuses any
 * product id that is not in that store, so the list of ids a client sends
 * cannot reach across establishments.
 */
export const reorder = storeMutation({
  args: defs.reorder.args,
  permission: "products:write",
  handler: (ctx, args) => defs.reorder.handler(ctx, args),
});

export const setTrendingProducts = storeMutation({
  args: defs.setTrendingProducts.args,
  permission: "products:write",
  handler: (ctx, args) => defs.setTrendingProducts.handler(ctx, args),
});
