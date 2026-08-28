import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/uberEatsConnections";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Role } from "@be-in-digital/core/auth/rbac";

// === Internal (called from "use node" OAuth actions) ===

/** Full row including encrypted tokens — node actions only. */
export const getConnection = internalQuery(defs.getConnection);

/** Upsert the connection after token exchange/refresh. */
export const upsert = internalMutation(defs.upsert);

// === Client-facing ===

/** Safe connection metadata for the admin UI (no token material). */
// @guarded-inline: deployment-level integration state, not per-store.
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!hasPermission(user.role as Role, "settings:read")) {
      throw new Error("Access denied: settings:read required");
    }
    return defs.getStatus.handler(ctx);
  },
});

/** Disconnect the Uber Eats merchant connection. */
// @guarded-inline: auth alone let any account sever the Uber Eats integration.
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!hasPermission(user.role as Role, "settings:write")) {
      throw new Error("Access denied: settings:write required");
    }
    return defs.disconnect.handler(ctx);
  },
});
