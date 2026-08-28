/**
 * CMS Media App Wrappers
 *
 * All media queries/mutations in one file.
 * setMediaReady/setMediaFailed exposed as internalMutation only.
 * _getMediaInternal exposed as internalQuery for actions (confirmUpload, getPresignedUrlForMedia).
 *
 * NOTE: No "use node" here — actions live in separate files (cmsMediaConfirmUpload.ts, cmsMediaProcess.ts).
 */

import { internalMutation, internalQuery } from "./_generated/server"
import {
  storeQuery,
  storeMutation,
  storeIdFromField,
} from "./lib/storeFunctions"
import { v } from "convex/values"
import * as mediaDefs from "@be-in-digital/convex-functions/cmsMedia"

// ============================================================================
// Queries
// ============================================================================

// The media library is per-restaurant. These were auth-only with a client
// `storeId`, so any account could browse — and delete — another restaurant's
// assets.
export const listMedia = storeQuery({
  permission: "content:read",
  args: mediaDefs.listMedia.args,
  handler: (ctx, args) => mediaDefs.listMedia.handler(ctx, args),
})

export const getMedia = storeQuery({
  permission: "content:read",
  args: mediaDefs.getMedia.args,
  storeIdFrom: storeIdFromField("mediaId", "Media not found"),
  handler: (ctx, args) => mediaDefs.getMedia.handler(ctx, args),
})

// ============================================================================
// Mutations (auth-protected)
// ============================================================================

/** Reserve a media record before upload (status=processing) */
export const createMedia = storeMutation({
  permission: "content:write",
  args: mediaDefs.createMedia.args,
  handler: (ctx, args) => mediaDefs.createMedia.handler(ctx, args),
})

/** Delete a media item (blocked if referenced) */
export const deleteMedia = storeMutation({
  permission: "content:delete",
  args: mediaDefs.deleteMedia.args,
  handler: (ctx, args) => mediaDefs.deleteMedia.handler(ctx, args),
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
