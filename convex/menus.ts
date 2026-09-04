import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/menus";
import { claimMenuSyncWindow } from "@be-in-digital/convex-functions/rateLimit";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

// @public-by-design: menus are the published storefront offering.
export const list = query(defs.list);
// @public-by-design: menus are the published storefront offering
export const getById = query(defs.getById);

// === Mutations (with menu sync trigger) ===

/**
 * Book the Uber Eats and Deliveroo menu push for one establishment.
 *
 * The comment this replaces claimed the 5-second delay debounced rapid edits.
 * It did not: Convex does not dedupe scheduled jobs, so ten quick edits queued
 * ten sweeps five seconds apart — and each sweep pushed the menu of every
 * establishment on the deployment, not the one being edited.
 *
 * The claim below allows one push per (platform, establishment) per window, and
 * books it for the end of that window so the upload carries the burst's final
 * state. A menu upload is a full overwrite on both platforms, so one push at
 * the end says everything the intermediate ones would have.
 *
 * Non-critical, as before: failures are logged and the menu mutation stands.
 */
async function scheduleMenuSync(ctx: MutationCtx, storeId: Id<"stores">) {
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

/**
 * The establishment a menu belongs to.
 *
 * Read a second time inside the mutations: the seam resolves it for the
 * permission check but does not pass it to the handler, and `remove` deletes
 * the document the resolver reads — so it has to be read before the handler.
 */
const menuStoreId = storeIdFromDocument("Menu not found");

export const create = storeMutation({
  permission: "menus:write",
  args: defs.create.args,
  handler: async (ctx, args) => {
    const result = await defs.create.handler(ctx, args);
    await scheduleMenuSync(ctx, args.storeId);
    return result;
  },
});

export const update = storeMutation({
  permission: "menus:write",
  args: defs.update.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const storeId = await menuStoreId(ctx, args);
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx, storeId);
    return result;
  },
});

export const toggleStatus = storeMutation({
  permission: "menus:write",
  args: defs.toggleStatus.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const storeId = await menuStoreId(ctx, args);
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx, storeId);
    return result;
  },
});

export const remove = storeMutation({
  permission: "menus:write",
  args: defs.remove.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const storeId = await menuStoreId(ctx, args);
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx, storeId);
    return result;
  },
});
