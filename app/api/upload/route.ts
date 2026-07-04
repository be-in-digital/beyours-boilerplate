import { NextResponse } from "next/server"
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZES,
  type S3Folder,
} from "@/lib/aws"
import { isAuthenticated } from "@/lib/convex"

const VALID_FOLDERS = new Set<S3Folder>(["products", "branding", "stores", "cms", "users"])

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * POST /api/upload
 * Accepts multipart form data, uploads file server-side to S3.
 * No CORS config needed on the S3 bucket.
 *
 * Form fields:
 * - file: File
 * - folder: S3Folder (e.g. "users", "products")
 */
export async function POST(request: Request) {
  try {
    // Authentication check: reject unauthenticated requests
    const authenticated = await isAuthenticated()
    if (!authenticated) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    const folder = formData.get("folder") as string | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Fichier manquant" },
        { status: 400 }
      )
    }

    if (!folder || !VALID_FOLDERS.has(folder as S3Folder)) {
      return NextResponse.json(
        { error: `Dossier invalide. Acceptés: ${[...VALID_FOLDERS].join(", ")}` },
        { status: 400 }
      )
    }

    const contentType = file.type
    const s3Folder = folder as S3Folder

    // Validate MIME type
    const allowed = ALLOWED_MIME_TYPES[s3Folder]
    if (!allowed.includes(contentType)) {
      return NextResponse.json(
        { error: `Type non autorisé pour ${folder}. Acceptés: ${allowed.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[s3Folder]
    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
      return NextResponse.json(
        { error: `Fichier trop volumineux. Maximum: ${maxMB}MB` },
        { status: 400 }
      )
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME
    if (!bucketName) {
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      )
    }

    // Generate unique key
    const ext = MIME_TO_EXT[contentType] || "bin"
    const key = `${folder}/${crypto.randomUUID()}.${ext}`

    // Upload to S3 server-side
    const buffer = Buffer.from(await file.arrayBuffer())
    const client = getS3Client()

    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    )

    // Return a proxy URL since the S3 bucket is not publicly accessible
    const publicUrl = `/api/files/${key}`

    return NextResponse.json({
      key,
      publicUrl,
      size: file.size,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    )
  }
}
