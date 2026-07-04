"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getExtensionFromMimeType } from "@be-in-digital/cms";

const ALLOWED_FOLDERS = [
  "products",
  "branding",
  "stores",
  "cms",
  "email",
  "avatars",
  "blogs",
  "blog-auto",
  "storefront",
  "categories",
] as const;
type S3Folder = (typeof ALLOWED_FOLDERS)[number];

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

function buildPublicUrl(bucketName: string, region: string, key: string) {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
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
export const getPresignedUploadUrl = action({
  args: {
    folder: v.string(),
    contentType: v.string(),
    filename: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

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

    // Public URL (bucket policy allows public reads)
    const region = process.env.AWS_REGION ?? "eu-west-3";
    const publicUrl = buildPublicUrl(bucketName, region, key);

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

    // Only allow presign for processing or failed (retry) status
    if (media.status !== "processing" && media.status !== "failed") {
      throw new Error(
        `Cannot generate upload URL: media status is "${media.status}"`,
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
