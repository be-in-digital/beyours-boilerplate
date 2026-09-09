"use node";

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  buildDeliverooMenuPayload,
  collectDeliverooAvailabilityUpdates,
  type StoreIntegrationRecord,
  type ProductRecord,
  type CategoryRecord,
} from "@be-in-digital/convex-functions/deliverooMenuSync";
import { getPackageEnv, isSandbox } from "@be-in-digital/core/env";

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
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = isSandbox("deliveroo");

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

      // 10b. Push item availability (86'ing).
      //
      // Deliveroo keeps availability OUTSIDE the menu payload, so the menu we
      // just pushed advertises every published dish as orderable — including
      // the ones the kitchen has run out of. This second call switches the
      // sold-out ones off.
      //
      // A per-item DELTA (POST), deliberately, not the v2 PUT. PUT replaces the
      // whole availability state, and Convex is not the authority on it: staff
      // 86 dishes on the Deliveroo tablet and nothing writes that back, and no
      // order path decrements stock. A full replace on every catalogue edit
      // would un-86 whatever staff had marked out, roughly a minute later.
      // `collectDeliverooAvailabilityUpdates` therefore speaks only for
      // products with stock tracking on, and stays silent about the rest.
      //
      // Deliveroo prescribes waiting for the `menu.upload_result` webhook
      // before touching availability on a NEWLY uploaded menu. Item ids are
      // derived from stable product ids, so they already exist in the live
      // menu and this call lands; only a brand-new product can race, and the
      // next sync corrects it.
      const availabilityUpdates = collectDeliverooAvailabilityUpdates(products, categories);
      await deliveroo.setItemAvailability(
        credentials,
        integration.brandId,
        menuId,
        integration.platformStoreId,
        availabilityUpdates
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
 * Spacing between the pushes one sweep books.
 *
 * `runAfter(0)` for every store fired the whole fleet at once. One account,
 * one set of credentials: a deployment with thirty establishments opened thirty
 * simultaneous menu uploads, and Uber's own guidance puts the menu endpoint at
 * roughly one call a minute per store with the token endpoint capped at a
 * hundred an hour. Two seconds apart turns a stampede into a queue.
 */
const SWEEP_STAGGER_MS = 2_000;

/**
 * Sync menu to ALL stores that have Deliveroo sync enabled.
 *
 * A deliberate full sweep — an operator asking for everything to be re-pushed,
 * or a future cron. It is NOT what a catalogue edit triggers any more: product
 * and menu mutations book `internalSyncStore` for the one establishment they
 * changed, through the per-store window in `claimMenuSyncWindow`. Calling this
 * on every edit is what turned a fifty-product import into a hundred sweeps,
 * each of them uploading every restaurant's menu.
 *
 * The pushes are spaced by `SWEEP_STAGGER_MS` so a fleet does not arrive at the
 * platform in one burst.
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

    // One push per store, spaced out rather than all at once.
    for (const [index, integration] of syncableIntegrations.entries()) {
      await ctx.scheduler.runAfter(
        index * SWEEP_STAGGER_MS,
        internal.deliverooMenuSync.internalSyncStore,
        { storeId: integration.storeId as Id<"stores"> }
      );
    }

    console.log(`Scheduled menu sync for ${syncableIntegrations.length} store(s)`);
    return { synced: syncableIntegrations.length };
  },
});
