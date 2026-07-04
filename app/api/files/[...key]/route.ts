import { NextResponse } from "next/server"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"

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
 * Proxies S3 objects so the bucket doesn't need public access.
 * Responses are cached for 1 year (immutable assets with UUID names).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params
  const key = segments.join("/")

  if (!key || key.includes("..")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 })
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

    return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(bytes.length),
      },
    })
  } catch (error: unknown) {
    const code = (error as { name?: string })?.name
    if (code === "NoSuchKey") {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }
    console.error("S3 proxy error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
