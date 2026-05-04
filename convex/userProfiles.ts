import { query, mutation } from "./_generated/server"
import * as defs from "@be-in-digital/convex-functions/userProfiles"

// === Queries ===

export const getByUserId = query(defs.getByUserId)

/**
 * Get the authenticated user's own profile
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first()
  },
})

// === Mutations ===

export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const ADMIN_ROLES = ["super_admin", "client_admin"]
    if (ADMIN_ROLES.includes(args.role)) {
      const currentProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
        .first()

      if (!currentProfile || currentProfile.role !== "super_admin") {
        throw new Error("Only super_admin can assign admin roles")
      }
    }

    return defs.upsert.handler(ctx, args)
  },
})

/**
 * Update own profile (customer-facing)
 */
export const updateMyProfile = mutation({
  args: {
    phones: defs.updateProfile.args.phones,
    language: defs.updateProfile.args.language,
    avatarUrl: defs.updateProfile.args.avatarUrl,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    return defs.updateProfile.handler(ctx, {
      userId: identity.subject,
      ...args,
    })
  },
})
