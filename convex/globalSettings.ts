import { query, mutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/globalSettings";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clientSecret: _secret, clientId: _clientId, ...safeUberDirect } = uberDirect;
  return {
    ...rest,
    integrations: {
      ...otherIntegrations,
      uberDirect: safeUberDirect,
    },
  };
}

export const get = query({
  args: defs.get.args,
  handler: async (ctx) => {
    const settings = await defs.get.handler(ctx);
    return stripSensitiveGlobalSettings(settings);
  },
});

/** Admin-only query: returns full global settings including integration secrets */
export const getAdmin = query({
  args: defs.get.args,
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!["owner", "admin", "super_admin"].includes(user.role)) {
      throw new Error("Admin access required");
    }
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

export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!["owner", "admin", "super_admin"].includes(user.role)) {
      throw new Error("Admin access required");
    }
    return defs.upsert.handler(ctx, args);
  },
});
