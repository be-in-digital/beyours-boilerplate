"use node"

/**
 * CMS Media S3 Purge Action
 *
 * Deletes the objects a media row owned, after the row itself has gone.
 *
 * `deleteMedia` removed the Convex row and nothing else — `DeleteObjectCommand`
 * appeared nowhere in the repository, so every file a restaurant ever deleted
 * was still in the bucket. An erasure request could not be satisfied, and the
 * media library reported a deletion that had not happened.
 *
 * A mutation cannot reach S3, so this runs as a scheduled action. Its keys
 * arrive as arguments: the row is already committed away by the time it runs
 * and there is nothing left to look them up from.
 *
 * Best-effort by design. A key that is already absent is a success (S3 delete
 * is idempotent), and one that fails is logged rather than thrown — retrying
 * the whole action would re-delete the keys that worked, and the row is gone
 * either way.
 */

import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

export const purgeS3Objects = internalAction({
  args: {
    s3Keys: v.array(v.string()),
  },
  handler: async (_ctx, args): Promise<{ deleted: number; failed: number }> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    if (!bucketName) {
      console.error("[purgeS3Objects] AWS_S3_BUCKET_NAME is not set")
      return { deleted: 0, failed: args.s3Keys.length }
    }

    const client = createS3Client()
    let deleted = 0
    let failed = 0

    for (const key of args.s3Keys) {
      // A key that could climb out of the media prefix never came from
      // `collectMediaS3Keys`; refusing it costs nothing and keeps this action
      // from becoming a general-purpose bucket eraser.
      if (!key || key.includes("..")) {
        failed += 1
        continue
      }

      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
        )
        deleted += 1
      } catch (error) {
        failed += 1
        console.error(`[purgeS3Objects] Failed to delete ${key}:`, error)
      }
    }

    return { deleted, failed }
  },
})
