import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/storeIntegrations";
import { storeQuery, authedQuery, authedMutation } from "./lib/storeFunctions";

// Internal (no-auth) variant for webhook handlers, which run without a user identity.
export const internalListByPlatformEnabled = internalQuery({
  args: defs.listByPlatformEnabled.args,
  handler: async (ctx, args) => defs.listByPlatformEnabled.handler(ctx, args),
});

// === Queries (auth-protected where applicable) ===

export const listByStore = storeQuery({
  args: defs.listByStore.args,
  handler: (ctx, args) => defs.listByStore.handler(ctx, args),
});
export const listByPlatformEnabled = authedQuery({
  args: defs.listByPlatformEnabled.args,
  handler: (ctx, args) => defs.listByPlatformEnabled.handler(ctx, args),
});

export const getByStorePlatform = storeQuery({
  args: defs.getByStorePlatform.args,
  handler: (ctx, args) => defs.getByStorePlatform.handler(ctx, args),
});

export const getBySiteId = authedQuery({
  args: defs.getBySiteId.args,
  handler: (ctx, args) => defs.getBySiteId.handler(ctx, args),
});

export const getByBrandId = authedQuery({
  args: defs.getByBrandId.args,
  handler: (ctx, args) => defs.getByBrandId.handler(ctx, args),
});

// === Mutations (protected) ===

export const upsert = authedMutation({
  args: defs.upsert.args,
  handler: (ctx, args) => defs.upsert.handler(ctx, args),
});

export const updateMenuSyncStatus = authedMutation({
  args: defs.updateMenuSyncStatus.args,
  handler: (ctx, args) => defs.updateMenuSyncStatus.handler(ctx, args),
});

export const remove = authedMutation({
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const toggleAutoAccept = authedMutation({
  args: defs.toggleAutoAccept.args,
  handler: (ctx, args) => defs.toggleAutoAccept.handler(ctx, args),
});

export const updateOrderMode = authedMutation({
  args: defs.updateOrderMode.args,
  handler: (ctx, args) => defs.updateOrderMode.handler(ctx, args),
});

// === Internal Mutations (for webhooks and schedulers) ===

export const internalUpdateMenuSyncStatus = internalMutation(defs.updateMenuSyncStatus);
export const internalUpsert = internalMutation(defs.upsert);

export const setOrderMode = internalMutation({
  args: {
    platformStoreId: v.string(),
    platform: v.union(v.literal("uberEats"), v.literal("deliveroo")),
    orderMode: v.union(v.literal("auto_accept"), v.literal("auto_reject"), v.literal("manual")),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("storeIntegrations")
      .withIndex("by_platform_enabled", (q) => q.eq("platform", args.platform).eq("enabled", true))
      .filter((q) => q.eq(q.field("platformStoreId"), args.platformStoreId))
      .first();
    if (!integration) throw new Error(`No integration found for ${args.platformStoreId}`);
    await ctx.db.patch(integration._id, { orderMode: args.orderMode });
    return { success: true, id: integration._id, orderMode: args.orderMode };
  },
});
