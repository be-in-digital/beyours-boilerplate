import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/uberEatsConnections";

// === Internal (called from "use node" OAuth actions) ===

/** Full row including encrypted tokens — node actions only. */
export const getConnection = internalQuery(defs.getConnection);

/** Upsert the connection after token exchange/refresh. */
export const upsert = internalMutation(defs.upsert);

// === Client-facing ===

/** Safe connection metadata for the admin UI (no token material). */
export const getStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.getStatus.handler(ctx);
  },
});

/** Disconnect the Uber Eats merchant connection. */
export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.disconnect.handler(ctx);
  },
});
