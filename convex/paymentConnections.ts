import { mutation, internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/paymentConnections";
import { v } from "convex/values";
import { authedQuery } from "./lib/storeFunctions";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Role } from "@be-in-digital/core/auth/rbac";

/**
 * Payment connections are deployment-level, not store-level, so the store-scoped
 * seam does not apply — authorisation is a plain permission check.
 *
 * These were bare public queries. The encrypted tokens are stripped by the defs
 * layer, but the merchant id, the provider and the connection state were
 * readable by anyone.
 */
async function requirePaymentsRead(ctx: Parameters<typeof getAuthUser>[0]) {
  const user = await getAuthUser(ctx);
  if (!hasPermission(user.role as Role, "payments:read")) {
    throw new Error("Access denied: payments:read required");
  }
}

// === Queries ===

/** Internal: get full record WITH encrypted tokens — for payment actions only */
export const internalGetByProvider = internalQuery({
  args: {
    provider: v.union(v.literal("stripe"), v.literal("sumup"), v.literal("paypal")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentConnections")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .first();
  },
});

/** Get all connections (tokens stripped). */
// @guarded-inline: deployment-level, guarded by payments:read in the handler
export const getAll = authedQuery({
  args: defs.getAll.args,
  handler: async (ctx) => {
    await requirePaymentsRead(ctx);
    return defs.getAll.handler(ctx);
  },
});

// === Mutations ===

/**
 * Internal upsert called exclusively from the OAuth callback action.
 * Not callable from the client.
 */
export const upsert = internalMutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    return defs.upsert.handler(ctx, args);
  },
});

/**
 * Disconnect (delete) a payment connection.
 * Requires an authenticated session.
 */
// @guarded-inline: deployment-level, so the store seam does not apply — but
// auth alone let any account sever the restaurant's payment provider.
export const disconnect = mutation({
  args: defs.disconnect.args,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!hasPermission(user.role as Role, "settings:write")) {
      throw new Error("Access denied: settings:write required");
    }
    return defs.disconnect.handler(ctx, args);
  },
});
