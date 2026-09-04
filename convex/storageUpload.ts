"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getExtensionFromMimeType,
  validateMediaUpload,
} from "@be-in-digital/cms";
import { buildMediaUrl } from "@be-in-digital/core/aws/media-url";
import {
  S3_FOLDERS,
  type S3Folder as CoreS3Folder,
} from "@be-in-digital/core/aws/folders";

// The folder list is defined once, in @be-in-digital/core/aws/folders, and is
// what /api/files will serve. Redeclaring it here is how category, blog and
// storefront uploads ended up with URLs that 404.
const ALLOWED_FOLDERS = S3_FOLDERS;
type S3Folder = CoreS3Folder;

const ALLOWED_MIME_TYPES: Record<S3Folder, string[]> = {
  products: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  branding: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  stores: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  cms: [
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml",
    "video/mp4", "video/webm",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  email: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  avatars: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  blogs: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  "blog-auto": ["image/png", "image/webp"],
  storefront: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"],
  categories: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  users: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
};

function createS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION ?? "eu-west-3",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * The bucket is private: a key becomes either a CDN URL or a path on this
 * app's own `/api/files` proxy. One policy, in `@be-in-digital/core`.
 */
function buildPublicUrl(key: string): string {
  return buildMediaUrl(key, process.env.AWS_S3_PUBLIC_BASE_URL)
}

/**
 * Generate a presigned URL for direct browser-to-S3 upload.
 * Used for non-CMS uploads (products, branding, stores, email).
 *
 * Flow:
 *  1. Client calls this action with folder + contentType
 *  2. Returns { uploadUrl, key, publicUrl }
 *  3. Client PUTs file directly to uploadUrl
 *  4. Client stores publicUrl as the permanent accessible URL
 */
// @guarded-inline: checks content:write by role — no store to scope against
export const getPresignedUploadUrl = action({
  args: {
    folder: v.string(),
    contentType: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Deployment-wide operation with no store to scope against. "Logged in"
    // included every customer account, so the check is by role.
    await ctx.runQuery(internal.authHelpers.checkPermission, {
      permission: "content:write",
    });

    // Validate folder
    const folder = args.folder as S3Folder;
    if (!ALLOWED_FOLDERS.includes(folder)) {
      throw new Error(`Dossier non autorisé: ${args.folder}`);
    }

    // Validate MIME type
    const allowedTypes = ALLOWED_MIME_TYPES[folder];
    if (!allowedTypes.includes(args.contentType)) {
      throw new Error(
        `Type MIME non autorisé pour le dossier "${folder}". Types acceptés: ${allowedTypes.join(", ")}`
      );
    }

    // Generate unique key with sanitized filename
    const ext = getExtensionFromMimeType(args.contentType);
    const uuid = crypto.randomUUID();
    const sanitizedFilename = (args.filename ?? "")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 100);
    const name = sanitizedFilename ? `${sanitizedFilename}-${uuid}` : uuid;
    const key = `${folder}/${name}.${ext}`;

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const client = createS3Client();

    // Presigned PUT URL for upload (15 min)
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: args.contentType,
    });
    const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 900 });

    // Where the browser will read it back from. The bucket grants no
    // anonymous read, so this is the CDN or this app's /api/files proxy.
    const publicUrl = buildPublicUrl(key);

    return { uploadUrl, key, publicUrl };
  },
});

/**
 * Generate a presigned URL for a CMS media upload.
 * The S3 key is derived server-side from the media record — no client-provided key.
 *
 * Flow:
 *  1. Client calls createMedia (gets mediaId)
 *  2. Client calls this action with mediaId
 *  3. Returns { uploadUrl, sourceKey }
 *  4. Client PUTs file to uploadUrl
 *  5. Client calls confirmUpload({ mediaId })
 */
// @guarded-inline: checks content:write on the store owning the media
export const getPresignedUrlForMedia = action({
  args: {
    mediaId: v.id("cmsMedia"),
  },
  handler: async (ctx, args): Promise<{ uploadUrl: string; sourceKey: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Read the media record
    const media = await ctx.runQuery(
      internal.cmsMedia._getMediaInternal,
      { mediaId: args.mediaId },
    );
    if (!media) throw new Error("Media not found");

    // The media record carries the restaurant it belongs to. Without this, any
    // logged-in account could confirm or re-presign an upload for any store's
    // media library.
    await ctx.runQuery(internal.authHelpers.checkStorePermission, {
      storeId: media.storeId,
      permission: "content:write",
    });

    // Only allow presign for processing or failed (retry) status
    if (media.status !== "processing" && media.status !== "failed") {
      throw new Error(
        `Cannot generate upload URL: media status is "${media.status}"`,
      );
    }

    // The row's own MIME type becomes the presigned `ContentType`, so this is
    // where an unacceptable one turns into a signed permission to upload it.
    // `createMedia` refuses these now, but rows written before that guard
    // existed still carry whatever they were given, and a retry presign reads
    // them straight back. Re-check rather than trust the row.
    const validation = validateMediaUpload(
      media.filename,
      media.mimeType,
      media.size,
    );
    if (!validation.valid) {
      throw new Error(
        `Cannot generate upload URL: ${validation.error?.message ?? "media refusé"}`,
      );
    }

    // Derive canonical S3 key
    const ext = getExtensionFromMimeType(media.mimeType);
    const sourceKey = `cms/${args.mediaId}/source.${ext}`;

    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const client = createS3Client();

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: sourceKey,
      ContentType: media.mimeType,
    });
    const uploadUrl = await getSignedUrl(client, putCommand, { expiresIn: 900 });

    return { uploadUrl, sourceKey };
  },
});
