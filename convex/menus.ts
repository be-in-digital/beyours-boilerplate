import { query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import * as defs from "@be-in-digital/convex-functions/menus";
import { touchesTranslatableText } from "@be-in-digital/convex-functions/autoTranslate";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { scheduleMenuSync } from "./lib/menuSync";
import { scheduleTranslation } from "./autoTranslate";

// === Queries (public for storefront) ===

// @public-by-design: menus are the published storefront offering.
export const list = query(defs.list);
// === Mutations (with menu sync trigger) ===

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
    await scheduleMenuSync(ctx, [args.storeId]);
    await scheduleTranslation(ctx, result, "menus", args.storeId);
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
    await scheduleMenuSync(ctx, [storeId]);
    if (touchesTranslatableText(args)) {
      await scheduleTranslation(ctx, args.id, "menus", storeId);
    }
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
    await scheduleMenuSync(ctx, [storeId]);
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
    // The menu's own name and description, in every language the owner added,
    // are of no use to anything once the menu is gone. A first batch goes with
    // it; the rest is drained here.
    if (result.hasMore) {
      await ctx.scheduler.runAfter(0, internal.menus.purgeTranslations, {
        menuId: args.id,
        storeId,
      });
    }
    await scheduleMenuSync(ctx, [storeId]);
    return result;
  },
});

export const purgeTranslations = internalMutation({
  args: defs.purgeTranslations.args,
  handler: async (ctx, args) => {
    const { hasMore } = await defs.purgeTranslations.handler(ctx, args);
    if (hasMore) {
      await ctx.scheduler.runAfter(0, internal.menus.purgeTranslations, args);
    }
  },
});
