// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * The media library refuses hostile uploads, and forgets what it deletes (#167).
 *
 * Two holes, both measured against the running functions before this suite
 * existed:
 *
 *   - `createMedia` inserted whatever it was handed. It accepted `text/html`
 *     and a 5 GB SVG. `validateMediaUpload` — the allow-list — was imported in
 *     exactly two places, `CmsMediaPicker` and `CmsMediaLibrary`, both browser
 *     components. The client validated and the server did not, and the client
 *     is not the security boundary: `createMedia`, `getPresignedUrlForMedia`
 *     and `confirmUpload` are all public Convex functions.
 *   - `confirmUpload` routed `image/svg+xml` around sharp and straight to
 *     `setMediaReady`. Nothing on that path read the bytes, so an SVG carrying
 *     `<script>` and `onload=` reached `status: "ready"` — measured, it
 *     returned `{"status":"ready"}`.
 *   - `deleteMedia` removed the Convex row only. `DeleteObjectCommand` appeared
 *     nowhere in the repository, so no erasure request could be satisfied.
 *
 * These run the real functions against the real schema. S3 is mocked because
 * the assertions are about which commands the code sends, not about AWS.
 */

import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { api, internal } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"

const send = vi.fn()

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send })),
  HeadObjectCommand: vi.fn((input: unknown) => ({ _cmd: "head", input })),
  GetObjectCommand: vi.fn((input: unknown) => ({ _cmd: "get", input })),
  PutObjectCommand: vi.fn((input: unknown) => ({ _cmd: "put", input })),
  DeleteObjectCommand: vi.fn((input: unknown) => ({ _cmd: "delete", input })),
}))

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000

const HOSTILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
  "<script>alert(document.cookie)</script></svg>"

const CLEAN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
  '<circle cx="5" cy="5" r="4" fill="#c00"/></svg>'

const harnesses: ReturnType<typeof convexTest>[] = []

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

beforeEach(() => {
  vi.clearAllMocks()
  send.mockResolvedValue({})
  process.env.AWS_S3_BUCKET_NAME = "test-bucket"
  process.env.AWS_REGION = "eu-west-3"
  process.env.AWS_ACCESS_KEY_ID = "test"
  process.env.AWS_SECRET_ACCESS_KEY = "test"
})

/**
 * Cancel whatever the test left on the scheduler.
 *
 * `deleteMedia` now queues the S3 purge through `ctx.scheduler.runAfter`. A
 * test finishes in milliseconds and leaves it pending; whatever fires it next
 * writes against a transaction that closed, and because nothing awaits it that
 * arrives as an unhandled rejection — a run then reports every test green and
 * still exits 1. Same guard as `store-deletion.test.ts`.
 */
afterEach(async () => {
  for (const t of harnesses) {
    await t.run(async (ctx) => {
      const pending = await ctx.db.system.query("_scheduled_functions").collect()
      for (const job of pending) {
        if (job.state.kind === "pending" || job.state.kind === "inProgress") {
          await ctx.scheduler.cancel(job._id)
        }
      }
    })
  }
  harnesses.length = 0
})

async function seedStore(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Le Bistrot",
      slug: "le-bistrot",
      address: {
        street: "1 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        country: "France",
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

/** A restaurant owner: the role that legitimately uploads to the media library. */
async function seedAdmin(
  t: ReturnType<typeof convexTest>,
  storeId: Id<"stores">
) {
  await t.run((ctx) =>
    ctx.db.insert("userProfiles", {
      userId: "admin-1",
      role: "client_admin" as const,
      storeIds: [storeId],
      permissions: [],
      language: "fr",
      twoFactorEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
  return t.withIdentity({ subject: "admin-1" })
}

/** Inserts a row directly, the way a version without the guard would have. */
async function seedMediaRow(
  t: ReturnType<typeof convexTest>,
  storeId: Id<"stores">,
  overrides: Record<string, unknown>
) {
  return t.run((ctx) =>
    ctx.db.insert("cmsMedia", {
      storeId,
      kind: "image" as const,
      status: "processing" as const,
      filename: "photo.png",
      mimeType: "image/png",
      size: 1024,
      usageCount: 0,
      uploadedBy: "admin-1",
      uploadedAt: NOW,
      ...overrides,
    } as never)
  )
}

/** The keys every `DeleteObjectCommand` sent during the test named. */
function deletedKeys(): string[] {
  return send.mock.calls
    .map(([cmd]) => cmd as { _cmd?: string; input?: { Key?: string } })
    .filter((cmd) => cmd?._cmd === "delete")
    .map((cmd) => cmd.input?.Key ?? "")
}

// ============================================================================
// createMedia is the server-side allow-list
// ============================================================================

describe("createMedia refuses what the media library must not store", () => {
  test("refuses text/html — an upload path that accepts HTML is stored XSS", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    await expect(
      admin.mutation(api.cmsMedia.createMedia, {
        storeId,
        kind: "file",
        filename: "payload.html",
        mimeType: "text/html",
        size: 512,
        uploadedBy: "admin-1",
      })
    ).rejects.toThrow(/Type MIME "text\/html" non autoris/)

    const rows = await t.run((ctx) => ctx.db.query("cmsMedia").collect())
    expect(rows).toHaveLength(0)
  })

  test("refuses a 5 GB SVG", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    await expect(
      admin.mutation(api.cmsMedia.createMedia, {
        storeId,
        kind: "image",
        filename: "huge.svg",
        mimeType: "image/svg+xml",
        size: 5 * 1024 * 1024 * 1024,
        uploadedBy: "admin-1",
      })
    ).rejects.toThrow(/trop volumineux/)
  })

  test("refuses an image over the 10 MB cap", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    await expect(
      admin.mutation(api.cmsMedia.createMedia, {
        storeId,
        kind: "image",
        filename: "photo.png",
        mimeType: "image/png",
        size: 10 * 1024 * 1024 + 1,
        uploadedBy: "admin-1",
      })
    ).rejects.toThrow(/trop volumineux/)
  })

  test("refuses a filename whose extension contradicts the MIME type", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    await expect(
      admin.mutation(api.cmsMedia.createMedia, {
        storeId,
        kind: "image",
        filename: "payload.html",
        mimeType: "image/png",
        size: 1024,
        uploadedBy: "admin-1",
      })
    ).rejects.toThrow(/ne correspond pas au type "image\/png"/)
  })

  test("refuses a kind that contradicts the MIME type", async () => {
    // `kind` is a separate argument the caller picks, and it is what
    // `confirmUpload` branches on: an SVG declared as kind "file" skipped the
    // image path entirely.
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    await expect(
      admin.mutation(api.cmsMedia.createMedia, {
        storeId,
        kind: "file",
        filename: "photo.png",
        mimeType: "image/png",
        size: 1024,
        uploadedBy: "admin-1",
      })
    ).rejects.toThrow(/ne correspond pas au type MIME/)
  })

  test("still accepts a legitimate photograph", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await admin.mutation(api.cmsMedia.createMedia, {
      storeId,
      kind: "image",
      filename: "plat-du-jour.jpeg",
      mimeType: "image/jpeg",
      size: 2 * 1024 * 1024,
      uploadedBy: "admin-1",
    })

    const row = await t.run((ctx) => ctx.db.get(mediaId))
    expect(row?.status).toBe("processing")
    expect(row?.mimeType).toBe("image/jpeg")
  })
})

// ============================================================================
// The presign path cannot outrun createMedia
// ============================================================================

describe("getPresignedUrlForMedia re-checks the row it signs for", () => {
  test("refuses a row whose MIME type createMedia would now reject", async () => {
    // The presigned PUT carries `ContentType: media.mimeType`. A row written
    // before the guard existed still holds whatever it was given, and a retry
    // presign reads it straight back.
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      kind: "file" as const,
      filename: "payload.html",
      mimeType: "text/html",
      size: 512,
    })

    await expect(
      admin.action(api.storageUpload.getPresignedUrlForMedia, { mediaId })
    ).rejects.toThrow(/Type MIME "text\/html" non autoris/)
  })

  test("refuses a row that is over the size cap", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      filename: "huge.svg",
      mimeType: "image/svg+xml",
      size: 5 * 1024 * 1024 * 1024,
    })

    await expect(
      admin.action(api.storageUpload.getPresignedUrlForMedia, { mediaId })
    ).rejects.toThrow(/trop volumineux/)
  })
})

// ============================================================================
// confirmUpload reads an SVG before it publishes it
// ============================================================================

describe("confirmUpload and the SVG branch", () => {
  /** HEAD succeeds, GET returns `body`. */
  function s3Returning(body: string) {
    send.mockImplementation(async (cmd: { _cmd: string }) => {
      if (cmd._cmd === "get") {
        return { Body: { transformToString: async () => body } }
      }
      return {}
    })
  }

  test("refuses an SVG carrying <script> and onload=, and removes the object", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)
    s3Returning(HOSTILE_SVG)

    const mediaId = await seedMediaRow(t, storeId, {
      filename: "logo.svg",
      mimeType: "image/svg+xml",
      size: HOSTILE_SVG.length,
    })

    const result = await admin.action(
      api.cmsMediaConfirmUpload.confirmUpload,
      { mediaId }
    )

    expect(result.status).toBe("failed")

    const row = await t.run((ctx) => ctx.db.get(mediaId))
    expect(row?.status).toBe("failed")
    expect(row?.errorCode).toBe("SVG_ACTIVE_CONTENT")
    // Refused means gone: the key is derivable from the mediaId alone, so a
    // leftover object is a live URL.
    expect(deletedKeys()).toContain(`cms/${mediaId}/source.svg`)
  })

  test("publishes an SVG that carries no active content", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)
    s3Returning(CLEAN_SVG)

    const mediaId = await seedMediaRow(t, storeId, {
      filename: "logo.svg",
      mimeType: "image/svg+xml",
      size: CLEAN_SVG.length,
    })

    const result = await admin.action(
      api.cmsMediaConfirmUpload.confirmUpload,
      { mediaId }
    )

    expect(result.status).toBe("ready")

    const row = await t.run((ctx) => ctx.db.get(mediaId))
    expect(row?.status).toBe("ready")
    expect(row?.s3Key).toBe(`cms/${mediaId}/source.svg`)
    expect(deletedKeys()).toHaveLength(0)
  })

  test("rewrites a published SVG with Content-Disposition: attachment", async () => {
    // A presigned PUT can only carry headers the signature covers, so the
    // browser's upload lands without one. `/api/files` forces `attachment` on
    // read, but a deployment serving the bucket through a CDN never goes
    // through it — the inertness has to travel with the object.
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)
    s3Returning(CLEAN_SVG)

    const mediaId = await seedMediaRow(t, storeId, {
      filename: "logo.svg",
      mimeType: "image/svg+xml",
      size: CLEAN_SVG.length,
    })

    await admin.action(api.cmsMediaConfirmUpload.confirmUpload, { mediaId })

    const puts = send.mock.calls
      .map(([cmd]) => cmd as { _cmd?: string; input?: Record<string, unknown> })
      .filter((cmd) => cmd?._cmd === "put")

    expect(puts).toHaveLength(1)
    expect(puts[0]?.input).toMatchObject({
      Key: `cms/${mediaId}/source.svg`,
      ContentType: "image/svg+xml",
      ContentDisposition: "attachment",
      Body: CLEAN_SVG,
    })
  })

  test("refuses a row the allow-list would never have accepted", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      kind: "file" as const,
      filename: "payload.html",
      mimeType: "text/html",
      size: 512,
    })

    const result = await admin.action(
      api.cmsMediaConfirmUpload.confirmUpload,
      { mediaId }
    )

    expect(result.status).toBe("failed")
    const row = await t.run((ctx) => ctx.db.get(mediaId))
    expect(row?.errorCode).toBe("INVALID_UPLOAD")
  })
})

// ============================================================================
// deleteMedia takes the files with it
// ============================================================================

describe("deleteMedia purges S3", () => {
  test("schedules a purge of the source and every variant", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      status: "ready" as const,
      s3Key: "cms/abc/source.png",
      sourceUrl: "/api/files/cms/abc/source.png",
      variants: {
        thumb: {
          url: "/api/files/cms/abc/thumb.webp",
          width: 400,
          height: 400,
        },
        card: { url: "/api/files/cms/abc/card.webp", width: 800, height: 450 },
        og: { url: "/api/files/cms/abc/og.webp", width: 1200, height: 630 },
      },
    })

    await admin.mutation(api.cmsMedia.deleteMedia, { storeId, mediaId })

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )
    expect(scheduled).toHaveLength(1)
    expect(scheduled[0]?.name).toBe("cmsMediaDelete:purgeS3Objects")

    const args = scheduled[0]?.args?.[0] as { s3Keys: string[] }
    expect([...args.s3Keys].sort()).toEqual([
      "cms/abc/card.webp",
      "cms/abc/og.webp",
      "cms/abc/source.png",
      "cms/abc/thumb.webp",
    ])
  })

  test("recovers keys from a legacy row that only stored URLs", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      status: "ready" as const,
      url: "/api/files/cms/legacy/source.png",
      thumbnailUrl: "/api/files/cms/legacy/thumb.webp",
    })

    await admin.mutation(api.cmsMedia.deleteMedia, { storeId, mediaId })

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )
    const args = scheduled[0]?.args?.[0] as { s3Keys: string[] }
    expect([...args.s3Keys].sort()).toEqual([
      "cms/legacy/source.png",
      "cms/legacy/thumb.webp",
    ])
  })

  test("a media referenced by a CMS block keeps its row and its files", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      status: "ready" as const,
      s3Key: "cms/used/source.png",
      usageCount: 1,
    })

    await t.run((ctx) =>
      ctx.db.insert("cmsBlocks", {
        storeId,
        pageSlug: "home",
        blockKey: "hero",
        isDraft: false,
        values: { image: { mediaId } },
        updatedAt: NOW,
        updatedBy: "admin-1",
      })
    )

    await expect(
      admin.mutation(api.cmsMedia.deleteMedia, { storeId, mediaId })
    ).rejects.toThrow(/referenced in block/)

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )
    expect(scheduled).toHaveLength(0)
    expect(await t.run((ctx) => ctx.db.get(mediaId))).not.toBeNull()
  })

  test("a media referenced by a blog article keeps its row and its files", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const admin = await seedAdmin(t, storeId)

    const mediaId = await seedMediaRow(t, storeId, {
      status: "ready" as const,
      s3Key: "cms/cover/source.png",
    })

    const categoryId = await t.run((ctx) =>
      ctx.db.insert("blogCategories", {
        storeId,
        name: "Actualités",
        slug: "actualites",
        sortOrder: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )

    await t.run((ctx) =>
      ctx.db.insert("blogArticles", {
        storeId,
        status: "draft" as const,
        hasUnpublishedChanges: true,
        draftSlug: "notre-nouvelle-carte",
        draftCategoryId: categoryId,
        draftAuthorId: "admin-1",
        draftContent: {
          title: "Notre nouvelle carte",
          slug: "notre-nouvelle-carte",
          excerpt: "Ce que le chef a prévu pour cet automne.",
          coverImageId: mediaId,
          content: "<p>Bientôt.</p>",
          updatedAt: NOW,
        },
        createdAt: NOW,
        updatedAt: NOW,
        updatedBy: "admin-1",
      })
    )

    await expect(
      admin.mutation(api.cmsMedia.deleteMedia, { storeId, mediaId })
    ).rejects.toThrow(/blog article/)

    const scheduled = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    )
    expect(scheduled).toHaveLength(0)
  })

  test("purgeS3Objects sends a DeleteObjectCommand per key", async () => {
    const t = newHarness()

    const result = await t.action(internal.cmsMediaDelete.purgeS3Objects, {
      s3Keys: ["cms/abc/source.png", "cms/abc/thumb.webp"],
    })

    expect(result).toEqual({ deleted: 2, failed: 0 })
    expect(deletedKeys()).toEqual([
      "cms/abc/source.png",
      "cms/abc/thumb.webp",
    ])
  })

  test("purgeS3Objects refuses a key that could climb out of the prefix", async () => {
    const t = newHarness()

    const result = await t.action(internal.cmsMediaDelete.purgeS3Objects, {
      s3Keys: ["cms/../../etc/passwd"],
    })

    expect(result).toEqual({ deleted: 0, failed: 1 })
    expect(deletedKeys()).toHaveLength(0)
  })

  test("one failing key does not stop the rest", async () => {
    const t = newHarness()
    send.mockImplementation(async (cmd: { input?: { Key?: string } }) => {
      if (cmd.input?.Key === "cms/abc/thumb.webp") {
        throw new Error("AccessDenied")
      }
      return {}
    })

    const result = await t.action(internal.cmsMediaDelete.purgeS3Objects, {
      s3Keys: [
        "cms/abc/source.png",
        "cms/abc/thumb.webp",
        "cms/abc/card.webp",
      ],
    })

    expect(result).toEqual({ deleted: 2, failed: 1 })
  })
})
