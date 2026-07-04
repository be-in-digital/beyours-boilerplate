import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * CSRF state store for OAuth connect flows (Uber Eats, and reusable for others).
 *
 * `create` is called when the authorize URL is built (admin-authenticated).
 * `consume` is called on the provider redirect callback: it matches the state,
 * deletes it (single-use), and confirms it has not expired. A missing/expired/
 * mismatched state must abort the token exchange.
 */

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const create = internalMutation({
  args: { provider: v.string(), state: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("oauthStates", {
      provider: args.provider,
      state: args.state,
      expiresAt: Date.now() + STATE_TTL_MS,
    });
  },
});

export const consume = internalMutation({
  args: { provider: v.string(), state: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const row = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!row) return false;
    // Single-use: always delete once matched, even on provider/expiry mismatch.
    await ctx.db.delete(row._id);
    if (row.provider !== args.provider) return false;
    if (row.expiresAt < Date.now()) return false;
    return true;
  },
});
