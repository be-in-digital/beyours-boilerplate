"use node"

/**
 * CMS SVG Upload Action
 *
 * Receives SVG string, sanitizes it, uploads to S3.
 * Runs in Node.js environment for S3 SDK access.
 */

import { action } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { sanitizeSvg } from "@be-in-digital/cms"

const MAX_SVG_SIZE = 1 * 1024 * 1024 // 1MB

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

function buildPublicUrl(key: string): string {
  const bucketName = process.env.AWS_S3_BUCKET_NAME!
  const region = process.env.AWS_REGION ?? "eu-west-3"
  const base = process.env.AWS_S3_PUBLIC_BASE_URL
  return base ? `${base}/${key}` : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
}

export const uploadSvg = action({
  args: {
    storeId: v.id("stores"),
    mediaId: v.id("cmsMedia"),
    svgContent: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    // Verify media record exists and belongs to the store
    const media = await ctx.runQuery(
      internal.cmsMedia._getMediaInternal,
      { mediaId: args.mediaId },
    )
    if (!media) throw new Error("Media not found")
    if (media.storeId !== args.storeId) throw new Error("Unauthorized")

    // Validate size
    if (args.svgContent.length > MAX_SVG_SIZE) {
      throw new Error("Le fichier SVG dépasse la taille maximale de 1MB")
    }

    // Sanitize
    const { sanitized, removedElements } = sanitizeSvg(args.svgContent)

    // Canonical S3 key derived from mediaId
    const key = `cms/${args.mediaId}/source.svg`

    // Upload to S3
    const bucketName = process.env.AWS_S3_BUCKET_NAME!
    const client = createS3Client()

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: sanitized,
        ContentType: "image/svg+xml",
      }),
    )

    // Mark as ready immediately (SVG: no processing needed)
    const publicUrl = buildPublicUrl(key)
    await ctx.runMutation(internal.cmsMedia.setMediaReady, {
      mediaId: args.mediaId,
      s3Key: key,
      sourceUrl: publicUrl,
    })

    return {
      sanitizedElements: removedElements,
      size: sanitized.length,
    }
  },
})
