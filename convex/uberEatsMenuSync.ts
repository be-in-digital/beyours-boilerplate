"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  buildUberEatsMenuPayload,
  type StoreIntegrationRecord,
  type ProductRecord,
  type CategoryRecord,
} from "@be-in-digital/convex-functions/uberEatsMenuSync";
import { getPackageEnv, getSiteEnv } from "@be-in-digital/core/env";

/**
 * Sync menu to a single Uber Eats store.
 *
 * This is a public action callable from the client (e.g. admin UI "Sync Now" button).
 *
 * Flow:
 * 1. Auth check
 * 2. Get the store integration for uberEats
 * 3. Check syncMenu=true and enabled=true
 * 4. Update menuSyncStatus to "syncing"
 * 5. Fetch all products and categories from DB
 * 6. Read global settings to resolve priceMarkup
 * 7. Format as Uber Eats menu payload (with markup / platformOverrides)
 * 8. Read credentials from process.env
 * 9. Call pushMenu() from integrations package
 * 10. Update menuSyncStatus to "success" or "error"
 */
export const syncStore = action({
  args: { storeId: v.id("stores") },
  handler: async (ctx, args) => {
    // Note: No auth check here — syncStore is also scheduled by syncAllStores (no user context).
    // Protection: syncAllStores is an internalAction, and direct calls only trigger a harmless menu push.

    // 1. Get the store integration for uberEats
    const integration = await ctx.runQuery(
      api.storeIntegrations.getByStorePlatform,
      { storeId: args.storeId, platform: "uberEats" }
    ) as StoreIntegrationRecord | null;

    if (!integration) {
      console.error(`No Uber Eats integration found for store ${args.storeId}`);
      return { success: false, error: "No Uber Eats integration configured" };
    }

    // 3. Check syncMenu and enabled flags
    if (!integration.enabled) {
      console.log(`Uber Eats integration disabled for store ${args.storeId}`);
      return { success: false, error: "Integration is disabled" };
    }

    if (!integration.syncMenu) {
      console.log(`Menu sync disabled for store ${args.storeId}`);
      return { success: false, error: "Menu sync is disabled" };
    }

    // 4. Update status to "syncing"
    await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
      storeId: args.storeId,
      platform: "uberEats",
      menuSyncStatus: "syncing",
    });

    try {
      // 5. Fetch all products and categories
      const products = await ctx.runQuery(api.products.list, {
        storeId: args.storeId,
      }) as ProductRecord[];

      const categories = await ctx.runQuery(api.categories.list, {
        storeId: args.storeId,
      }) as CategoryRecord[];

      // 6. Read global settings to extract the Uber Eats price markup
      const settings = await ctx.runQuery(internal.globalSettings.getInternal, {}) as {
        integrations?: { uberEats?: { priceMarkup?: number } }
      } | null;
      const priceMarkup = settings?.integrations?.uberEats?.priceMarkup ?? 0;

      // 7. Build menu payload, applying markup or individual product overrides
      const menuPayload = buildUberEatsMenuPayload(products, categories, priceMarkup);

      // 8. Read credentials from environment
      const pkg = getPackageEnv();
      const site = getSiteEnv();
      const clientId = pkg.UBER_EATS_CLIENT_ID;
      const clientSecret = pkg.UBER_EATS_CLIENT_SECRET;
      const sandboxMode = site.UBER_EATS_SANDBOX_MODE === "true";

      if (!clientId || !clientSecret) {
        throw new Error("Uber Eats API credentials not configured in environment");
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      // 9. Push menu to Uber Eats
      const { uberEats } = await import("@be-in-digital/integrations");
      await uberEats.pushMenu(credentials, integration.platformStoreId, menuPayload);

      // 10. Update status to "success"
      await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
        storeId: args.storeId,
        platform: "uberEats",
        menuSyncStatus: "success",
      });

      console.log(`Menu synced successfully for store ${args.storeId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Menu sync failed for store ${args.storeId}:`, errorMessage);

      // Update status to "error"
      await ctx.runMutation(internal.storeIntegrations.internalUpdateMenuSyncStatus, {
        storeId: args.storeId,
        platform: "uberEats",
        menuSyncStatus: "error",
        menuSyncError: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});

/**
 * Sync menu to ALL stores that have Uber Eats sync enabled.
 *
 * This is an internal action triggered automatically after product mutations.
 * It queries all enabled Uber Eats integrations with syncMenu=true and
 * schedules individual syncStore actions for each.
 */
export const syncAllStores = internalAction({
  args: {},
  handler: async (ctx) => {
    // Query all enabled Uber Eats integrations
    const allIntegrations = await ctx.runQuery(
      api.storeIntegrations.listByPlatformEnabled,
      { platform: "uberEats" }
    ) as StoreIntegrationRecord[];

    // Filter to only those with menu sync enabled
    const syncableIntegrations = allIntegrations.filter(
      (i) => i.syncMenu && i.enabled
    );

    if (syncableIntegrations.length === 0) {
      console.log("No stores with Uber Eats menu sync enabled");
      return { synced: 0 };
    }

    // Schedule sync for each store (runs in parallel as separate actions)
    for (const integration of syncableIntegrations) {
      await ctx.scheduler.runAfter(
        0,
        api.uberEatsMenuSync.syncStore,
        { storeId: integration.storeId as Id<"stores"> }
      );
    }

    console.log(`Scheduled menu sync for ${syncableIntegrations.length} store(s)`);
    return { synced: syncableIntegrations.length };
  },
});
