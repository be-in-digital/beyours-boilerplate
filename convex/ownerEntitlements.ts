/**
 * Owner Entitlements App Wrappers
 *
 * Auth-protected wrappers around package-level entitlements functions.
 * All queries and mutations require authentication.
 */

import { query, mutation } from "./_generated/server"
import * as ownerEntitlementsDefs from "@be-in-digital/convex-functions/ownerEntitlements"

// ============================================================================
// Queries
// ============================================================================

/** Get entitlements for the authenticated owner */
export const getMyEntitlements = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return ownerEntitlementsDefs.getByOwnerId.handler(ctx, {
      ownerId: identity.subject,
    })
  },
})

/** Get entitlements by ownerId (admin use) */
export const getByOwnerId = query({
  args: ownerEntitlementsDefs.getByOwnerId.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return ownerEntitlementsDefs.getByOwnerId.handler(ctx, args)
  },
})

// ============================================================================
// Mutations
// ============================================================================

/** Upsert owner entitlements — restricted to own entitlements only */
export const upsert = mutation({
  args: ownerEntitlementsDefs.upsert.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    // Enforce: users can only modify their own entitlements
    if (args.ownerId !== identity.subject) {
      throw new Error("Forbidden: cannot modify another user's entitlements")
    }
    return ownerEntitlementsDefs.upsert.handler(ctx, args)
  },
})
