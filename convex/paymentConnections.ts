import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/paymentConnections";
import { v } from "convex/values";

// === Queries ===

/** Get a single connection by provider (tokens stripped). */
export const getByProvider = query(defs.getByProvider);

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
export const getAll = query(defs.getAll);

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
export const disconnect = mutation({
  args: defs.disconnect.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.disconnect.handler(ctx, args);
  },
});
