/**
 * CMS Media App Wrappers
 *
 * All media queries/mutations in one file.
 * setMediaReady/setMediaFailed exposed as internalMutation only.
 * _getMediaInternal exposed as internalQuery for actions (confirmUpload, getPresignedUrlForMedia).
 *
 * NOTE: No "use node" here — actions live in separate files (cmsMediaConfirmUpload.ts, cmsMediaProcess.ts).
 */

import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server"
import { v } from "convex/values"
import * as mediaDefs from "@be-in-digital/convex-functions/cmsMedia"

// ============================================================================
// Queries
// ============================================================================

/** List media for a store (auth-protected) */
export const listMedia = query({
  args: mediaDefs.listMedia.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return mediaDefs.listMedia.handler(ctx, args)
  },
})

/** Get a single media item (auth-protected) */
export const getMedia = query({
  args: mediaDefs.getMedia.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return mediaDefs.getMedia.handler(ctx, args)
  },
})

// ============================================================================
// Mutations (auth-protected)
// ============================================================================

/** Reserve a media record before upload (status=processing) */
export const createMedia = mutation({
  args: mediaDefs.createMedia.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return mediaDefs.createMedia.handler(ctx, args)
  },
})

/** Delete a media item (blocked if referenced) */
export const deleteMedia = mutation({
  args: mediaDefs.deleteMedia.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return mediaDefs.deleteMedia.handler(ctx, args)
  },
})

// ============================================================================
// Internal Mutations (called by upload pipeline only, not from UI)
// ============================================================================

/** Mark media as ready after processing */
export const setMediaReady = internalMutation(mediaDefs.setMediaReady)

/** Mark media as failed after processing error */
export const setMediaFailed = internalMutation(mediaDefs.setMediaFailed)

// ============================================================================
// Internal Queries (called by actions: confirmUpload, getPresignedUrlForMedia)
// ============================================================================

/** Read a media record without auth (for internal pipeline use) */
export const _getMediaInternal = internalQuery({
  args: { mediaId: v.id("cmsMedia") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.mediaId)
  },
})
