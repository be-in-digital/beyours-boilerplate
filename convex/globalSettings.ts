import { query, mutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/globalSettings";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Role } from "@be-in-digital/core/auth/rbac";

/**
 * Global settings are owner-level, not store-level, so the store-scoped
 * `storeMutation` seam does not apply. Authorisation is a plain permission
 * check instead.
 *
 * This used to be a hardcoded `["owner", "admin", "super_admin"]` list. Two of
 * those three roles do not exist in the schema (`super_admin`, `client_admin`,
 * `manager`, `kitchen`, `waiter`, `delivery`, `customer`), so the restaurant
 * owner — a `client_admin` — was refused on every save. `settings:write` is
 * held by exactly SUPER_ADMIN and CLIENT_ADMIN, which is the intent.
 */
async function requireSettingsPermission(
  ctx: Parameters<typeof getAuthUser>[0],
  permission: "settings:read" | "settings:write"
) {
  const user = await getAuthUser(ctx);
  if (!hasPermission(user.role as Role, permission)) {
    throw new Error("Admin access required");
  }
  return user;
}

// === Queries ===

/**
 * Public query: returns global settings WITHOUT sensitive integration credentials.
 * Use getAdmin for full data (requires auth).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripSensitiveGlobalSettings(settings: any) {
  if (!settings) return settings;
  const { integrations, ...rest } = settings;
  if (!integrations) return settings;
  const { uberDirect, ...otherIntegrations } = integrations;
  if (!uberDirect) return settings;
  // All four are Uber Direct credentials. `customerId` and `apiKey` were left
  // in, so the public storefront query served them to anonymous visitors — and
  // the `@public-by-design` note below claimed the opposite.
  const {
    clientSecret: _secret,
    clientId: _clientId,
    customerId: _customerId,
    apiKey: _apiKey,
    ...safeUberDirect
  } = uberDirect;
  return {
    ...rest,
    integrations: {
      ...otherIntegrations,
      uberDirect: safeUberDirect,
    },
  };
}

// @public-by-design: the storefront needs tax rate, delivery config and
// opening rules before any sign-in. All four Uber Direct credentials are
// stripped above.
export const get = query({
  args: defs.get.args,
  handler: async (ctx) => {
    const settings = await defs.get.handler(ctx);
    return stripSensitiveGlobalSettings(settings);
  },
});

/** Admin-only query: returns full global settings including integration secrets */
// @guarded-inline: settings:read / settings:write checked in the handler
export const getAdmin = query({
  args: defs.get.args,
  handler: async (ctx) => {
    await requireSettingsPermission(ctx, "settings:read");
    return defs.get.handler(ctx);
  },
});

/** Internal query: returns full settings for server-side functions (no auth needed) */
export const getInternal = internalQuery({
  args: defs.get.args,
  handler: async (ctx) => {
    return defs.get.handler(ctx);
  },
});

// === Mutations ===

// @guarded-inline: settings:read / settings:write checked in the handler
export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    await requireSettingsPermission(ctx, "settings:write");
    return defs.upsert.handler(ctx, args);
  },
});
