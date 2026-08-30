/**
 * The read half of the storage policy (P0-34).
 *
 * The bucket is private, so this route is how every image reaches a browser.
 * What it must not become is a general-purpose reader for the bucket: a key
 * outside the folders the product uploads to is not served at all.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const send = vi.fn()

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send })),
  GetObjectCommand: vi.fn((input: unknown) => ({ input })),
}))

const { GET } = await import("@/app/api/files/[...key]/route")

/** Calls the route the way Next does, with `key` as path segments. */
function get(key: string) {
  return GET(new Request(`https://resto.fr/api/files/${key}`), {
    params: Promise.resolve({ key: key.split("/") }),
  })
}

function s3Object(body: string, contentType = "image/webp") {
  return {
    ContentType: contentType,
    Body: {
      transformToByteArray: async () => new TextEncoder().encode(body),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AWS_S3_BUCKET_NAME = "test-bucket"
  process.env.AWS_REGION = "eu-west-3"
  process.env.AWS_ACCESS_KEY_ID = "test"
  process.env.AWS_SECRET_ACCESS_KEY = "test"
})

describe("GET /api/files/:key", () => {
  it("serves an uploaded CMS image to an anonymous visitor", async () => {
    // The storefront is public and its visitors have no session — this is the
    // path a published CMS image takes on a fresh deployment.
    send.mockResolvedValue(s3Object("bytes"))

    const response = await get("cms/abc123/source.webp")

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("image/webp")
    expect(await response.text()).toBe("bytes")
  })

  it("reads the key it was given, unchanged", async () => {
    send.mockResolvedValue(s3Object("bytes"))

    await get("products/9d1f.webp")

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { Bucket: "test-bucket", Key: "products/9d1f.webp" },
      })
    )
  })

  it.each(["products", "branding", "stores", "cms", "email", "users"])(
    "serves the %s folder the product uploads to",
    async (folder) => {
      send.mockResolvedValue(s3Object("bytes"))

      expect((await get(`${folder}/x.webp`)).status).toBe(200)
    }
  )

  it.each(["backups/dump.sql", "exports/orders.csv", "x.webp"])(
    "refuses %s — outside the folders the product writes to",
    async (key) => {
      const response = await get(key)

      expect(response.status).toBe(404)
      expect(send).not.toHaveBeenCalled()
    }
  )

  it("refuses to climb out of the bucket prefix", async () => {
    const response = await get("cms/../../etc/passwd")

    expect(response.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it("refuses a key smuggled into one segment as %2F", async () => {
    // Next decodes catch-all segments, so `cms%2F..%2Fx` arrives as a single
    // segment carrying slashes — it must not be reassembled into a key.
    const response = await GET(new Request("https://resto.fr/api/files/x"), {
      params: Promise.resolve({ key: ["cms/../../etc/passwd"] }),
    })

    expect(response.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it("refuses an empty segment", async () => {
    const response = await GET(new Request("https://resto.fr/api/files/x"), {
      params: Promise.resolve({ key: ["cms", "", "a.webp"] }),
    })

    expect(response.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it("answers 404 for a key that is not in the bucket", async () => {
    send.mockRejectedValue(Object.assign(new Error("nope"), { name: "NoSuchKey" }))

    expect((await get("cms/missing.webp")).status).toBe(404)
  })

  it("does not leak the reason an S3 read failed", async () => {
    send.mockRejectedValue(
      Object.assign(new Error("AccessDenied: arn:aws:iam::1234:user/deploy"), {
        name: "AccessDenied",
      })
    )

    const response = await get("cms/x.webp")

    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain("arn:aws")
  })

  it("reports a missing bucket as a configuration error, not a 404", async () => {
    delete process.env.AWS_S3_BUCKET_NAME

    expect((await get("cms/x.webp")).status).toBe(500)
  })
})

/**
 * The framing half (P0-27).
 *
 * These assert the route actually wires `buildFileResponseHeaders` in. The
 * pure function is covered in `lib/services/__tests__/file-serving.test.ts`;
 * what a unit test of it cannot show is that the response really carries what
 * it decided — which is the seam the stored-XSS report went through.
 */
describe("GET /api/files/:key — what the response is allowed to become", () => {
  it("serves a stored SVG as an attachment, not as a document", async () => {
    // The report's payload, still in the bucket: uploaded before the fix, and
    // never re-uploaded. The framing has to hold on the way out.
    send.mockResolvedValue(
      s3Object(
        `<svg xmlns="http://www.w3.org/2000/svg"><script>fetch('/api/auth/get-session')</script></svg>`,
        "image/svg+xml"
      )
    )

    const response = await get("cms/trap.svg")

    expect(response.headers.get("Content-Disposition")).toBe("attachment")
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("Content-Security-Policy")).toContain("sandbox")
  })

  it("keeps image/svg+xml so an SVG logo still draws in <img>", async () => {
    send.mockResolvedValue(s3Object("<svg/>", "image/svg+xml"))

    expect((await get("branding/logo.svg")).headers.get("Content-Type")).toBe(
      "image/svg+xml"
    )
  })

  it("serves a photo inline", async () => {
    send.mockResolvedValue(s3Object("bytes", "image/png"))

    const response = await get("products/photo.png")

    expect(response.headers.get("Content-Disposition")).toBe("inline")
    expect(response.headers.get("Content-Type")).toBe("image/png")
  })

  it("attaches a type nobody thought about, rather than rendering it", async () => {
    send.mockResolvedValue(s3Object("<h1>hi</h1>", "text/html"))

    expect((await get("cms/x.html")).headers.get("Content-Disposition")).toBe(
      "attachment"
    )
  })

  it("puts a policy that cannot script or fetch on every response", async () => {
    for (const type of ["image/png", "image/svg+xml", "application/pdf"]) {
      send.mockResolvedValue(s3Object("bytes", type))

      const csp = (await get("cms/x")).headers.get("Content-Security-Policy")

      expect(csp).toContain("default-src 'none'")
      expect(csp).not.toContain("allow-scripts")
    }
  })
})
