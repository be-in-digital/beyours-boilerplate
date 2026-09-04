"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getPackageEnv, isSandbox } from "@be-in-digital/core/env";

/**
 * Admin actions wrapping each Uber Eats endpoint required by production validation.
 *
 * These exist so that every endpoint Uber wants to see a 200/204 on can be
 * triggered from the admin UI or a test script with one Convex call. Tests run
 * against the sandbox; the same code path will work in production once Uber
 * grants access.
 */

type UberCreds = {
  clientId: string;
  clientSecret: string;
  sandboxMode: boolean;
};

function readCredentials(): UberCreds {
  const pkg = getPackageEnv();
  const clientId = pkg.UBER_EATS_CLIENT_ID;
  const clientSecret = pkg.UBER_EATS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Uber Eats credentials not configured in environment");
  }
  return {
    clientId,
    clientSecret,
    sandboxMode: isSandbox("uberEats"),
  };
}

/**
 * Guard for every action in this file.
 *
 * It used to check only that someone was logged in, which let any customer
 * account activate integrations, rewrite menu items, create promotions and
 * mark orders ready on Uber Eats.
 *
 * The identifiers these actions take (`storeId`, `orderId`) are Uber Eats'
 * own UUIDs, not Convex ids, so there is no tenant to scope against — the
 * check has to be by role. These are integration-administration operations,
 * hence `settings:write`.
 */
async function requireAuth(ctx: ActionCtx): Promise<void> {
  await ctx.runQuery(internal.authHelpers.checkPermission, {
    permission: "settings:write",
  });
}

// ============================================================
// Integration Config
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const activateIntegration = action({
  args: {
    storeId: v.string(),
    integratorStoreId: v.string(),
    integratorBrandId: v.optional(v.string()),
    merchantStoreId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    await uberEats.activateIntegration(credentials, args.storeId, {
      integration_enabled: true,
      integrator_store_id: args.integratorStoreId,
      integrator_brand_id: args.integratorBrandId,
      merchant_store_id: args.merchantStoreId,
    });
    return { success: true, storeId: args.storeId };
  },
});

// @guarded-inline: requireAuth checks settings:write by role
export const getIntegrationDetails = action({
  args: { storeId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    // Cast to a structural type so the package interface name does not leak
    // into Convex's generated .d.ts (TS4023).
    return (await uberEats.getIntegrationDetails(credentials, args.storeId)) as Record<string, unknown>;
  },
});

// @guarded-inline: requireAuth checks settings:write by role
export const getStoresForUser = action({
  args: { limit: v.optional(v.number()), pageToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    const res = await uberEats.getStoresForUser(credentials, {
      limit: args.limit,
      pageToken: args.pageToken,
    });
    return res as { stores: Array<Record<string, unknown>>; next_page_token?: string };
  },
});

// ============================================================
// Menu
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const updateMenuItem = action({
  args: {
    storeId: v.string(),
    itemId: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    await uberEats.updateMenuItem(credentials, args.storeId, args.itemId, args.payload as Record<string, unknown>);
    return { success: true };
  },
});

// @guarded-inline: requireAuth checks settings:write by role
export const updateModifierGroup = action({
  args: {
    storeId: v.string(),
    modifierGroupId: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    await uberEats.updateModifierGroup(credentials, args.storeId, args.modifierGroupId, args.payload as Record<string, unknown>);
    return { success: true };
  },
});

// ============================================================
// Promotions
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const createPromotion = action({
  args: { storeId: v.string(), payload: v.any() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    return await uberEats.createPromotion(credentials, args.storeId, args.payload as Record<string, unknown>);
  },
});

// ============================================================
// Reporting
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const requestReport = action({
  args: {
    reportType: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    storeUuids: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    return await uberEats.requestReport(credentials, {
      report_type: args.reportType,
      start_date: args.startDate,
      end_date: args.endDate,
      store_uuids: args.storeUuids,
    });
  },
});

// ============================================================
// Order — Resolve Fulfillment Issues (recommended)
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const resolveFulfillmentIssues = action({
  args: { orderId: v.string(), payload: v.any() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    await uberEats.resolveFulfillmentIssues(credentials, args.orderId, args.payload as { fulfillment_issues: Array<{ issue_type: string }> });
    return { success: true };
  },
});

// ============================================================
// Order — Mark as Ready (also wired in kitchenTickets.readyTicket;
// exposed here for direct testing during Uber validation)
// ============================================================

// @guarded-inline: requireAuth checks settings:write by role
export const markOrderAsReady = action({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");
    await uberEats.markOrderAsReady(credentials, args.orderId);
    return { success: true };
  },
});

// ============================================================
// Validation runner — exercises every endpoint Uber requires.
// Invoke from the Convex dashboard with a testStoreUuid and (optionally) a
// testOrderId from the sandbox; capture the returned summary as proof for Uber.
// ============================================================

type EndpointResult = { name: string; status: "OK" | "FAIL" | "SKIP"; detail?: string };

async function runStep(
  results: EndpointResult[],
  name: string,
  fn: () => Promise<unknown>
): Promise<void> {
  try {
    const out = await fn();
    const preview = typeof out === "object" ? JSON.stringify(out).slice(0, 200) : String(out);
    results.push({ name, status: "OK", detail: preview });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, status: "FAIL", detail: msg });
  }
}

// @guarded-inline: requireAuth checks settings:write by role
export const runValidation = action({
  args: {
    testStoreUuid: v.string(),
    testOrderId: v.optional(v.string()),
    testItemId: v.optional(v.string()),
    runDestructive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const credentials = readCredentials();
    const { uberEats } = await import("@be-in-digital/integrations");

    const results: EndpointResult[] = [];

    await runStep(results, "OAuth token", () => uberEats.getAccessToken(credentials));

    await runStep(results, "Integration Config: Get Stores to User", () =>
      uberEats.getStoresForUser(credentials, { limit: 10 })
    );

    await runStep(results, "Integration Config: Get Integration Details", () =>
      uberEats.getIntegrationDetails(credentials, args.testStoreUuid)
    );

    await runStep(results, "Integration Config: Activate Integration", () =>
      uberEats.activateIntegration(credentials, args.testStoreUuid, {
        integration_enabled: true,
        integrator_store_id: "beindigital-test-store",
        integrator_brand_id: "beindigital",
      })
    );

    if (args.testItemId) {
      await runStep(results, "Menu: Update Item/modifier", () =>
        uberEats.updateMenuItem(credentials, args.testStoreUuid, args.testItemId!, {
          suspension_info: { suspension: { reason: "OUT_OF_STOCK" } },
        })
      );
    } else {
      results.push({ name: "Menu: Update Item/modifier", status: "SKIP", detail: "pass testItemId arg" });
    }

    await runStep(results, "Promotions: Create promotions", () =>
      // Payload shape verified live 2026-06-01 (returns 200 + promotion_id).
      uberEats.createPromotion(credentials, args.testStoreUuid, {
        start_time: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        end_time: new Date(Date.now() + 8 * 24 * 60 * 60_000).toISOString(),
        external_promotion_id: `BID_PROMO_${Date.now()}`,
        user_group: "ALL_CUSTOMERS",
        currency_code: "EUR",
        promo_type: "FLATOFF",
        budget: { unlimited_budget: true },
        promotion_discount: {
          flat_off_discount: {
            min_basket_constraint: { min_spend: { amount: 1000, currency_code: "EUR" } },
            discount_value: { amount: 400, currency_code: "EUR" },
          },
        },
      })
    );

    await runStep(results, "Reporting: Get Report files", () =>
      uberEats.requestReport(credentials, {
        report_type: "PAYMENT_DETAILS_REPORT",
        start_date: "2026-05-01",
        end_date: "2026-05-15",
        store_uuids: [args.testStoreUuid],
      })
    );

    if (args.testOrderId) {
      const orderId = args.testOrderId;
      await runStep(results, "Order: Get Order details (uAPI)", () =>
        uberEats.fetchOrder(credentials, orderId)
      );
      await runStep(results, "Order: Accept Order (uAPI)", () =>
        uberEats.acceptOrder(credentials, orderId)
      );
      await runStep(results, "Order: Mark Order as Ready", () =>
        uberEats.markOrderAsReady(credentials, orderId)
      );
      await runStep(results, "Order: Resolve Fulfillment Issues", () =>
        uberEats.resolveFulfillmentIssues(credentials, orderId, { fulfillment_issues: [] })
      );
      if (args.runDestructive) {
        await runStep(results, "Order: Deny Order (uAPI)", () =>
          uberEats.denyOrder(credentials, orderId, {
            code: "ITEM_AVAILABILITY",
            explanation: "Validation test",
          })
        );
        await runStep(results, "Order: Cancel Order (uAPI)", () =>
          uberEats.cancelOrder(credentials, orderId, {
            code: "OUT_OF_ITEMS",
            explanation: "Validation test",
          })
        );
      } else {
        results.push({
          name: "Order: Deny + Cancel (uAPI)",
          status: "SKIP",
          detail: "pass runDestructive:true to exercise",
        });
      }
    } else {
      results.push({
        name: "Order endpoints (Get/Accept/Ready/Deny/Cancel/Resolve)",
        status: "SKIP",
        detail: "place a test order on the sandbox, then pass testOrderId arg",
      });
    }

    const ok = results.filter((r) => r.status === "OK").length;
    const fail = results.filter((r) => r.status === "FAIL").length;
    const skip = results.filter((r) => r.status === "SKIP").length;
    return { summary: { ok, fail, skip }, results };
  },
});
