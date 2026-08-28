/**
 * Owner Entitlements App Wrappers
 *
 * Auth-protected wrappers around package-level entitlements functions.
 * All queries and mutations require authentication.
 */

import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server"
import { getAuthUser } from "@be-in-digital/convex-functions/auth"
import { Role } from "@be-in-digital/core/auth/rbac"
import * as ownerEntitlementsDefs from "@be-in-digital/convex-functions/ownerEntitlements"

// ============================================================================
// Queries
// ============================================================================

/** Get entitlements for the authenticated owner */
// @guarded-inline: derives the owner from the session; takes no id
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
/**
 * Internal only.
 *
 * This was a public query taking an arbitrary `ownerId` behind an auth-only
 * guard, so any account could read anyone's plan and subscription state. Its
 * only consumer is server-side (`bidSubscriptionInternal`); the admin UI reads
 * `getMyEntitlements`.
 */
export const internalGetByOwnerId = internalQuery(
  ownerEntitlementsDefs.getByOwnerId
)

// ============================================================================
// Mutations
// ============================================================================

/** Upsert owner entitlements — restricted to own entitlements only */
/**
 * Grant or change an owner's entitlements.
 *
 * @guarded-inline: super admin only.
 *
 * The previous guard read "users can only modify their OWN entitlements" — which
 * sounds protective and is the opposite. Entitlements gate paid features
 * (autoBlog and its plan limits); letting owners write their own meant anyone
 * could grant themselves a plan they had not bought. The schema says as much:
 * "Source of truth: Stripe BeYours webhooks. For now: manually settable by
 * admin." Stripe writes through the internal path; this is the admin hatch.
 */
export const upsert = mutation({
  args: ownerEntitlementsDefs.upsert.args,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx)
    if (user.role !== Role.SUPER_ADMIN) {
      throw new Error(
        "Seul un super administrateur peut modifier les droits d'un compte."
      )
    }
    return ownerEntitlementsDefs.upsert.handler(ctx, args)
  },
})

/** Written by the Stripe BeYours webhook, which has no user session. */
export const internalUpsert = internalMutation(ownerEntitlementsDefs.upsert)
