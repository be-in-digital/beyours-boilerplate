import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/storeIntegrations";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// Internal (no-auth) variant for webhook handlers, which run without a user identity.
export const internalListByPlatformEnabled = internalQuery({
  args: defs.listByPlatformEnabled.args,
  handler: async (ctx, args) => defs.listByPlatformEnabled.handler(ctx, args),
});

// Same, for the scheduled menu sync. `getByStorePlatform` below is store-scoped
// and needs a session; the scheduler has none, so the nightly push died on it.
export const internalGetByStorePlatform = internalQuery({
  args: defs.getByStorePlatform.args,
  handler: async (ctx, args) => defs.getByStorePlatform.handler(ctx, args),
});

// === Queries (auth-protected where applicable) ===

export const listByStore = storeQuery({
  permission: "settings:read",
  args: defs.listByStore.args,
  handler: (ctx, args) => defs.listByStore.handler(ctx, args),
});
export const getByStorePlatform = storeQuery({
  permission: "settings:read",
  args: defs.getByStorePlatform.args,
  handler: (ctx, args) => defs.getByStorePlatform.handler(ctx, args),
});

// `listByPlatformEnabled`, `getBySiteId` and `getByBrandId` search ACROSS every
// store — that is their whole purpose: an incoming Uber Eats or Deliveroo event
// carries a platform id, and these resolve which restaurant it belongs to. They
// cannot be store-scoped, and the webhooks that need them run as
// `internalAction`s with no user identity. So they are internal only; the public
// exports they used to have let anyone enumerate every connected restaurant.
export const internalGetBySiteId = internalQuery(defs.getBySiteId);
export const internalGetByBrandId = internalQuery(defs.getByBrandId);

// === Mutations (store-scoped) ===

export const upsert = storeMutation({
  permission: "settings:write",
  args: defs.upsert.args,
  handler: (ctx, args) => defs.upsert.handler(ctx, args),
});

export const updateMenuSyncStatus = storeMutation({
  permission: "settings:write",
  args: defs.updateMenuSyncStatus.args,
  handler: (ctx, args) => defs.updateMenuSyncStatus.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "settings:write",
  args: defs.remove.args,
  storeIdFrom: storeIdFromDocument("Integration not found"),
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const toggleAutoAccept = storeMutation({
  permission: "settings:write",
  args: defs.toggleAutoAccept.args,
  handler: (ctx, args) => defs.toggleAutoAccept.handler(ctx, args),
});

export const updateOrderMode = storeMutation({
  permission: "settings:write",
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
