"use node"

/**
 * CMS Media Upload Confirmation Action
 *
 * Verifies that the source file exists in S3, then either:
 *   - Schedules sharp processing for images (non-SVG)
 *   - Marks as ready immediately for SVG, video, files
 *
 * Idempotent:
 *   - status=ready → no-op success
 *   - status=processing → continue flow
 *   - status=failed → retry flow
 *   - deleted/missing → explicit error
 */

import { action } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3"
import { getExtensionFromMimeType } from "@be-in-digital/cms"
import { buildMediaUrl } from "@be-in-digital/core/aws/media-url"

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * The bucket is private: a key becomes either a CDN URL or a path on this
 * app's own `/api/files` proxy. One policy, in `@be-in-digital/core`.
 */
function buildPublicUrl(key: string): string {
  return buildMediaUrl(key, process.env.AWS_S3_PUBLIC_BASE_URL)
}

// @guarded-inline: checks content:write on the store owning the media
export const confirmUpload = action({
  args: {
    mediaId: v.id("cmsMedia"),
  },
  handler: async (ctx, args): Promise<{ status: "ready" | "processing" | "failed" }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // Read the media record
    const media = await ctx.runQuery(
      internal.cmsMedia._getMediaInternal,
      { mediaId: args.mediaId },
    )
    if (!media) throw new Error("Media not found")

    // The media record carries the restaurant it belongs to. Without this, any
    // logged-in account could confirm or re-presign an upload for any store's
    // media library.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: media.storeId,
      permission: "content:write",
    })

    // Idempotent: already ready → no-op
    if (media.status === "ready") {
      return { status: "ready" as const }
    }

    // Only processing or failed (retry) are valid
    if (media.status !== "processing" && media.status !== "failed") {
      throw new Error(
        `Cannot confirm upload: media status is "${media.status}"`,
      )
    }

    // Derive canonical S3 key
    const ext = getExtensionFromMimeType(media.mimeType)
    const s3Key = `cms/${args.mediaId}/source.${ext}`

    // HEAD check: verify source file exists in S3
    const bucketName = process.env.AWS_S3_BUCKET_NAME!
    const client = createS3Client()

    let exists = false
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: s3Key }),
      )
      exists = true
    } catch {
      exists = false
    }

    if (!exists) {
      await ctx.runMutation(internal.cmsMedia.setMediaFailed, {
        mediaId: args.mediaId,
        errorCode: "S3_NOT_FOUND",
        errorMessage: "Source file not found in S3 after upload",
      })
      return { status: "failed" as const }
    }

    // Determine processing path
    const isProcessableImage =
      media.kind === "image" && media.mimeType !== "image/svg+xml"

    if (isProcessableImage) {
      // Schedule sharp processing (runs immediately, 0ms delay)
      await ctx.scheduler.runAfter(
        0,
        internal.cmsMediaProcess.processImage,
        {
          mediaId: args.mediaId,
          s3Key,
          mimeType: media.mimeType,
        },
      )
      return { status: "processing" as const }
    } else {
      // SVG, video, file: mark ready immediately with sourceUrl + s3Key
      const sourceUrl = buildPublicUrl(s3Key)
      await ctx.runMutation(internal.cmsMedia.setMediaReady, {
        mediaId: args.mediaId,
        s3Key,
        sourceUrl,
      })
      return { status: "ready" as const }
    }
  },
})
