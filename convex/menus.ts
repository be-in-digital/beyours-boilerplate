import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/menus";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

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

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireStoreAccess(ctx, args.storeId);
    const result = await defs.create.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const menu = await ctx.db.get(args.id);
    if (!menu) throw new Error("Menu not found");
    await requireStoreAccess(ctx, menu.storeId);
    const result = await defs.update.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const toggleStatus = mutation({
  args: defs.toggleStatus.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const menu = await ctx.db.get(args.id);
    if (!menu) throw new Error("Menu not found");
    await requireStoreAccess(ctx, menu.storeId);
    const result = await defs.toggleStatus.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const menu = await ctx.db.get(args.id);
    if (!menu) throw new Error("Menu not found");
    await requireStoreAccess(ctx, menu.storeId);
    const result = await defs.remove.handler(ctx, args);
    await scheduleMenuSync(ctx);
    return result;
  },
});
