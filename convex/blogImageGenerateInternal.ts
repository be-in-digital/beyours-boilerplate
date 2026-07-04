/**
 * Blog Image Generate — Internal Functions
 *
 * internalQuery + internalMutation for the standalone image generation flow.
 * NO "use node" — these run in the default Convex runtime.
 * Called by the action in blogImageGenerate.ts ("use node").
 */

import { v } from "convex/values"
import { internalQuery, internalMutation } from "./_generated/server"
import { checkImageGenerationAccess } from "@be-in-digital/convex-functions/blogAutoGuards"
import { incrementImageUsageCore } from "@be-in-digital/convex-functions/blogAutoGenerate"

// ============================================================================
// Internal Queries
// ============================================================================

/** Check image generation access for the authenticated owner */
export const _checkImageAccess = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return checkImageGenerationAccess(ctx, ownerId)
  },
})

// ============================================================================
// Internal Mutations
// ============================================================================

/** Increment image generation usage counter */
export const _incrementImageUsage = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    await incrementImageUsageCore(ctx, ownerId)
  },
})
