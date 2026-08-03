import { query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/menus";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

export const list = query(defs.list);
export const getById = query(defs.getById);

// === Mutations (with menu sync trigger) ===

/**
 * Schedule Uber Eats and Deliveroo menu sync after a menu mutation.
 * Uses a 5-second delay to debounce rapid consecutive edits.
 * Non-critical: failures are logged but do not affect the menu mutation.
 */
async function scheduleMenuSync(ctx: MutationCtx) {
  try {
    await ctx.scheduler.runAfter(5000, internal.uberEatsMenuSync.syncAllStores, {});
    await ctx.scheduler.runAfter(5000, internal.deliverooMenuSync.syncAllStores, {});
  } catch (error) {
    console.error("Failed to schedule menu sync:", error);
  }
}

const menuStoreId = storeIdFromDocument("Menu not found");

export const create = storeMutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const result = await defs.create.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStatus = storeMutation({
  args: defs.toggleStatus.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: menuStoreId,
  handler: async (ctx, args) => {
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});
