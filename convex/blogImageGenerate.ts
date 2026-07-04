"use node"

/**
 * Blog Image Generate — Action (Node Runtime)
 *
 * Standalone image generation from a user prompt using GPT Image 1 Mini.
 * Flow: auth → quota check → OpenAI → S3 → cmsMedia → process → increment usage
 *
 * Usage is incremented AFTER S3 upload succeeds to avoid consuming quota on failures.
 */

import { v } from "convex/values"
import { action } from "./_generated/server"
import { internal } from "./_generated/api"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import type { Id } from "./_generated/dataModel"

// ============================================================================
// S3 Helpers (same pattern as blogAutoGenerate.ts / cmsMediaProcess.ts)
// ============================================================================

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

// ============================================================================
// Public Action
// ============================================================================

/**
 * Generate a single image from a user-provided prompt.
 * 1. Check image generation quota
 * 2. Call OpenAI gpt-image-1-mini
 * 3. Upload to S3 + create cmsMedia record
 * 4. Schedule image processing (thumb + card variants)
 * 5. Increment image usage (after S3 success)
 */
export const generateImage = action({
  args: {
    storeId: v.id("stores"),
    prompt: v.string(),
  },
  handler: async (ctx, args): Promise<{ url: string; mediaId: string; alt: string }> => {
    // 1. Auth check
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const ownerId = identity.subject

    // 1b. Input validation
    if (args.prompt.length > 1000) throw new Error("Prompt trop long (max 1000 caracteres)")

    // 2. Check image generation quota
    const access = await ctx.runQuery(
      internal.blogImageGenerateInternal._checkImageAccess,
      { ownerId }
    )
    if (!access.allowed) {
      throw new Error(access.reason ?? "Acces refuse")
    }

    // 3. Call OpenAI gpt-image-1-mini
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured")
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1-mini",
        prompt: args.prompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
      }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error")
      throw new Error(`OpenAI API error: ${res.status} — ${errorText}`)
    }

    const data = (await res.json()) as {
      data: Array<{ b64_json: string }>
    }

    const b64 = data.data?.[0]?.b64_json
    if (!b64) {
      throw new Error("OpenAI returned empty image data")
    }

    // 4. Decode base64 → Buffer
    const buffer = Buffer.from(b64, "base64")
    const filename = `blog-ai-${Date.now()}.png`

    // 5. Create cmsMedia record via existing _createBlogImage
    const mediaId: Id<"cmsMedia"> = await ctx.runMutation(
      internal.blogAutoGenerateInternal._createBlogImage,
      {
        storeId: args.storeId,
        filename,
        mimeType: "image/png",
        size: buffer.length,
        uploadedBy: ownerId,
      }
    )

    // 6. Upload to S3
    const s3Key = `cms/${mediaId}/source.png`
    const client = createS3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: s3Key,
        Body: buffer,
        ContentType: "image/png",
      })
    )

    // 7. Schedule sharp processing (thumb + card variants) async
    await ctx.scheduler.runAfter(
      0,
      internal.cmsMediaProcess.processImage,
      { mediaId, s3Key, mimeType: "image/png" }
    )

    // 8. Increment image usage AFTER S3 upload succeeds
    await ctx.runMutation(
      internal.blogImageGenerateInternal._incrementImageUsage,
      { ownerId }
    )

    // 9. Return immediate source URL (variants arrive async)
    const sourceUrl = buildPublicUrl(s3Key)

    return {
      url: sourceUrl,
      mediaId: mediaId as string,
      alt: args.prompt,
    }
  },
})
