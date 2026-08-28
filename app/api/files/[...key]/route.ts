import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { ALLOWED_MIME_TYPES, type S3Folder } from "@/lib/aws"
import { buildFileResponseHeaders } from "@/lib/services/file-serving"

/**
 * Folders the product writes to. A key outside them is not something this app
 * uploaded, so it is not something this app serves — the bucket is not a
 * general-purpose file host, even for whoever holds its credentials.
 */
const SERVABLE_FOLDERS = new Set<S3Folder>(
  Object.keys(ALLOWED_MIME_TYPES) as S3Folder[]
)

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
 * GET /api/files/:folder/:filename
 *
 * The read side of the storage policy: the bucket grants no anonymous read, so
 * every image on the storefront and in the admin comes through here, signed
 * with the deployment's own credentials. Deployments that put a CDN in front
 * of the bucket set `AWS_S3_PUBLIC_BASE_URL` and never reach this route.
 *
 * Anonymous by design — a storefront visitor has no session, and the storefront
 * is public. Responses are cached for a year: keys carry a UUID, so a given key
 * always denotes the same bytes.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params
  const key = segments.join("/")

  // Next hands back decoded segments, so a `%2F` arrives as a slash inside one
  // of them — reject that along with the empty and dot-dot segments rather
  // than letting a caller assemble a key the folder check never saw.
  const malformed = segments.some(
    (segment) => !segment || segment === ".." || segment.includes("/")
  )
  if (!key || malformed) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
  }

  if (!SERVABLE_FOLDERS.has(segments[0] as S3Folder)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const bucketName = process.env.AWS_S3_BUCKET_NAME
  if (!bucketName) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 500 })
  }

  try {
    const client = getS3Client()
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    )

    if (!response.Body) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const bytes = await response.Body.transformToByteArray()

    // The stored ContentType is attacker-influenced — it comes from the
    // multipart header of whoever uploaded the object — so it decides how the
    // response is framed, never whether it may become a document.
    return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
      status: 200,
      headers: buildFileResponseHeaders({
        contentType: response.ContentType,
        contentLength: bytes.length,
      }),
    })
  } catch (error: unknown) {
    const code = (error as { name?: string })?.name
    if (code === "NoSuchKey" || code === "NotFound") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    console.error("S3 proxy error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
