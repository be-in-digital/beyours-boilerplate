"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  buildDeliverooMenuPayload,
  type StoreIntegrationRecord,
  type ProductRecord,
  type CategoryRecord,
} from "@be-in-digital/convex-functions/deliverooMenuSync";
import { getPackageEnv, getSiteEnv } from "@be-in-digital/core/env";

/**
 * Sync menu to a single Deliveroo store.
 *
 * This is a public action callable from the client (e.g. admin UI "Sync Now" button).
 *
 * Flow:
 * 1. Auth check
 * 2. Get the store integration for deliveroo
 * 3. Check syncMenu=true and enabled=true
 * 4. Validate brandId is present
 * 5. Update menuSyncStatus to "syncing"
 * 6. Fetch all products and categories from DB
 * 7. Read global settings to resolve priceMarkup
 * 8. Format as Deliveroo menu payload (with markup / platformOverrides)
 * 9. Read credentials from process.env
 * 10. Call deliveroo.pushMenu() from integrations package
 * 11. Update menuSyncStatus to "success" or "error"
 */
/**
 * Push this store's menu to Deliveroo, on a human's request.
 *
 * Guarded — and deliberately a thin shell. The scheduled sweep runs without a
 * session, so it must NOT come through here: `syncAllStores` used to call this
 * very action, and adding the permission check killed the nightly push. The
 * work now lives in `internalSyncStore`, which the scheduler calls directly.
 */
// @guarded-inline: checks products:write on the store being synced
export const syncStore = action({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args): Promise<unknown> => {
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: args.storeId,
      permission: "products:write",
    });
    return ctx.runAction(internal.deliverooMenuSync.internalSyncStore, {
      storeId: args.storeId,
    });
  },
});

/**
 * The push itself, with no authorisation of its own.
 *
 * Reachable only from the guarded action above and from the scheduled sweep —
 * an `internalAction` cannot be called from a browser.
 */
export const internalSyncStore = internalAction({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    // `getByStorePlatform` is store-scoped and needs a session; the scheduler
    // has none, so the sweep died here before reaching Deliveroo at all.
    const integration = await ctx.runQuery(
      internal.storeIntegrations.internalGetByStorePlatform,
      { storeId: args.storeId, platform: "deliveroo" }
    ) as StoreIntegrationRecord | null;

    if (!integration) {
      console.error(`No Deliveroo integration found for store ${args.storeId}`);
      return { success: false, error: "No Deliveroo integration configured" };
    }

    // 3. Check syncMenu and enabled flags
    if (!integration.enabled) {
      console.log(`Deliveroo integration disabled for store ${args.storeId}`);
      return { success: false, error: "Integration is disabled" };
    }

    if (!integration.syncMenu) {
      console.log(`Menu sync disabled for store ${args.storeId}`);
      return { success: false, error: "Menu sync is disabled" };
    }

    // 4. Validate brandId is present
    if (!integration.brandId) {
      console.error(`No brandId configured for Deliveroo integration on store ${args.storeId}`);
      return { success: false, error: "Deliveroo brandId not configured" };
    }

    // 5. Update status to "syncing"
    await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
      storeId: args.storeId,
      platform: "deliveroo",
      menuSyncStatus: "syncing",
    });

    try {
      // 6. Fetch all products and categories
      const products = await ctx.runQuery(api.products.list, {
        storeId: args.storeId,
      }) as ProductRecord[];

      const categories = await ctx.runQuery(api.categories.list, {
        storeId: args.storeId,
      }) as CategoryRecord[];

      // 7. Read global settings to extract the Deliveroo price markup
      const settings = await ctx.runQuery(internal.globalSettings.getInternal, {}) as {
        integrations?: { deliveroo?: { priceMarkup?: number } }
      } | null;
      const priceMarkup = settings?.integrations?.deliveroo?.priceMarkup ?? 0;

      // 8. Build menu payload (V1 format), applying markup or individual product overrides
      const menuPayload = buildDeliverooMenuPayload(
        products,
        categories,
        integration.platformStoreId,
        priceMarkup
      );

      // 9. Read credentials from environment
      const pkg = getPackageEnv();
      const site = getSiteEnv();
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";

      if (!clientId || !clientSecret) {
        throw new Error("Deliveroo API credentials not configured in environment");
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      // 10. Push menu to Deliveroo (V1 API: PUT /v1/brands/{brandId}/menus/{menuId})
      const { deliveroo } = await import("@be-in-digital/integrations");
      const menuId = `menu-${integration.platformStoreId}`;
      await deliveroo.pushMenu(
        credentials,
        integration.brandId,
        menuId,
        menuPayload as unknown as Parameters<typeof deliveroo.pushMenu>[3]
      );

      // 11. Update status to "success"
      await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
        storeId: args.storeId,
        platform: "deliveroo",
        menuSyncStatus: "success",
      });

      console.log(`Menu synced successfully for store ${args.storeId}`);
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Menu sync failed for store ${args.storeId}:`, errorMessage);

      // Update status to "error"
      await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
        storeId: args.storeId,
        platform: "deliveroo",
        menuSyncStatus: "error",
        menuSyncError: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Fetch the current menu from Deliveroo to verify sync results.
 * Temporary diagnostic action — can be removed after verification.
 */
// @guarded-inline: checks products:write on the store being synced
export const checkMenu = action({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    // Pushing a menu to a delivery platform is a write on the restaurant's
    // catalogue. Nothing checked the caller at all before.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: args.storeId,
      permission: "products:write",
    });

    const integration = await ctx.runQuery(
      api.storeIntegrations.getByStorePlatform,
      { storeId: args.storeId, platform: "deliveroo" }
    ) as StoreIntegrationRecord | null;

    if (!integration?.brandId) {
      return { error: "No Deliveroo integration or brandId" };
    }

    const pkg = getPackageEnv();
    const site = getSiteEnv();
    const clientId = pkg.DELIVEROO_CLIENT_ID;
    const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
    const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";

    if (!clientId || !clientSecret) {
      return { error: "Missing Deliveroo credentials" };
    }

    const { deliveroo } = await import("@be-in-digital/integrations");
    const credentials = { clientId, clientSecret, sandboxMode };
    const menuId = `menu-${integration.platformStoreId}`;

    const response = await deliveroo.fetchDeliveroo(
      credentials,
      `/v1/brands/${integration.brandId}/menus/${menuId}`,
      {},
      "menu"
    );

    if (!response.ok) {
      const body = await response.text();
      return { error: `HTTP ${response.status}`, body };
    }

    const menu = await response.json();
    const data = menu as {
      name?: string;
      menu?: {
        categories?: Array<{ id: string; name: { en: string }; item_ids: string[] }>;
        items?: Array<{ id: string; name: { en: string }; price_info: { price: number } }>;
        modifiers?: Array<{ id: string; name: { en: string } }>;
        modifier_groups?: Array<{ id: string; name: { en: string } }>;
        mealtimes?: Array<{ id: string; name: { en: string }; category_ids: string[] }>;
      };
    };

    return {
      menuName: data.name,
      categories: (data.menu?.categories ?? []).map(c => ({ id: c.id, name: c.name?.en, itemCount: c.item_ids?.length })),
      itemCount: data.menu?.items?.length ?? 0,
      items: (data.menu?.items ?? []).map(i => ({ id: i.id, name: i.name?.en, price: i.price_info?.price })),
      modifierCount: data.menu?.modifiers?.length ?? 0,
      modifierGroupCount: data.menu?.modifier_groups?.length ?? 0,
      mealtimeCount: data.menu?.mealtimes?.length ?? 0,
    };
  },
});

/**
 * Sync menu to ALL stores that have Deliveroo sync enabled.
 *
 * This is an internal action triggered automatically after product mutations.
 * It queries all enabled Deliveroo integrations with syncMenu=true and
 * schedules individual syncStore actions for each.
 */
export const syncAllStores = internalAction({
  args: {},
  handler: async (ctx) => {
    // Query all enabled Deliveroo integrations
    const allIntegrations = await ctx.runQuery(
      internal.storeIntegrations.internalListByPlatformEnabled,
      { platform: "deliveroo" }
    ) as StoreIntegrationRecord[];

    // Filter to only those with menu sync enabled and brandId present
    const syncableIntegrations = allIntegrations.filter(
      (i) => i.syncMenu && i.enabled && i.brandId
    );

    if (syncableIntegrations.length === 0) {
      console.log("No stores with Deliveroo menu sync enabled");
      return { synced: 0 };
    }

    // Schedule sync for each store (runs in parallel as separate actions)
    for (const integration of syncableIntegrations) {
      await ctx.scheduler.runAfter(
        0,
        internal.deliverooMenuSync.internalSyncStore,
        { storeId: integration.storeId as Id<"stores"> }
      );
    }

    console.log(`Scheduled menu sync for ${syncableIntegrations.length} store(s)`);
    return { synced: syncableIntegrations.length };
  },
});
