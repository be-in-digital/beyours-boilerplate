/**
 * Blog Auto Usage App Wrappers
 *
 * Auth-protected wrappers for monthly quota queries.
 */

import { query } from "./_generated/server"
import * as blogAutoUsageDefs from "@be-in-digital/convex-functions/blogAutoUsage"
import { getCurrentPeriodKey } from "@be-in-digital/convex-functions/blogAutoUsage"

// ============================================================================
// Queries
// ============================================================================

/** Get current month usage for the authenticated owner */
// @guarded-inline: derives the owner from the session
export const getMyCurrentUsage = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const periodKey = getCurrentPeriodKey()
    return blogAutoUsageDefs.getByOwnerIdPeriod.handler(ctx, {
      ownerId: identity.subject,
      periodKey,
    })
  },
})
