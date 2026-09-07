// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * The nightly backup runs without a user, and lands somewhere that is not a
 * laptop.
 *
 * `grep backup` in `crons.ts` returned nothing. `exportBackup`'s only caller was
 * a button that built a Blob and triggered a browser download, and the function
 * could not be called from a cron at all: it opens with
 * `getAuthUserInternal`, which throws `"Not authenticated"` under a scheduled
 * job — the rule `crons.ts` states in its own header. So « Sauvegardes
 * automatiques quotidiennes de vos données et contenus » described a manual
 * export that happened when someone remembered. Issue #366.
 *
 * Two things are asserted, and the first is the one that made this impossible
 * before: the export core takes no identity, and the off-site write actually
 * puts bytes in the bucket.
 */

import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { internal } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import { backupObjectKey } from "../../convex/systemBackupOffsite"

const send = vi.fn()

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send })),
  PutObjectCommand: vi.fn((input: unknown) => ({ _cmd: "put", input })),
  DeleteObjectCommand: vi.fn((input: unknown) => ({ _cmd: "delete", input })),
  GetObjectCommand: vi.fn((input: unknown) => ({ _cmd: "get", input })),
  HeadObjectCommand: vi.fn((input: unknown) => ({ _cmd: "head", input })),
  ListObjectVersionsCommand: vi.fn((input: unknown) => ({ _cmd: "versions", input })),
}))

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000

beforeEach(() => {
  vi.clearAllMocks()
  send.mockResolvedValue({})
  process.env.AWS_S3_BUCKET_NAME = "test-bucket"
  process.env.AWS_REGION = "eu-west-3"
  process.env.AWS_ACCESS_KEY_ID = "test"
  process.env.AWS_SECRET_ACCESS_KEY = "test"
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** The single `PutObjectCommand` the backup issued. */
function putCall(): { Bucket?: string; Key?: string; Body?: string } | undefined {
  return send.mock.calls
    .map(([cmd]) => cmd as { _cmd?: string; input?: Record<string, string> })
    .find((cmd) => cmd?._cmd === "put")?.input
}

/**
 * The one row `_setLastBackupAt` needs.
 *
 * Seeded in the tests that exercise the normal path, because a deployment that
 * has been through setup has it — and the case where it is missing gets its own
 * test below rather than being the silent default of every other one.
 */
async function seedSettings(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) =>
    ctx.db.insert("globalSettings", {
      currency: "EUR",
      timezone: "Europe/Paris",
      taxRate: 10,
      services: { dineIn: true, takeaway: true, delivery: false, clickAndCollect: true },
      hours: [],
      delivery: {},
      integrations: {},
      updatedAt: NOW,
    })
  )
}

async function seedStore(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Pizzeria Napoli",
      slug: "pizzeria-napoli",
      address: {
        street: "12 rue Oberkampf",
        city: "Paris",
        postalCode: "75011",
        country: "France",
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

describe("the nightly backup", () => {
  test("builds an export with no user identity at all", async () => {
    /* The whole reason `buildBackup` exists. A scheduled job runs with no
       identity, so the guarded `exportBackup` — which opens with
       `getAuthUserInternal` — throws `"Not authenticated"` under a cron. */
    const t = convexTest(schema, modules)
    await seedSettings(t)
    await seedStore(t)

    const payload = await t.action(internal.system.buildBackup, {
      performedBy: "cron",
    })

    expect(payload.data.stores).toHaveLength(1)
    expect(payload.manifest.exportedBy).toBe("cron")
    // The four families a restore used to reach zero of.
    for (const table of ["orders", "payments", "kitchenTickets", "cmsHome"]) {
      expect(payload.manifest.tables).toContain(table)
    }
  })

  test("writes the export to the bucket, under backups/", async () => {
    const t = convexTest(schema, modules)
    await seedSettings(t)
    await seedStore(t)

    const outcome = await t.action(internal.systemBackupOffsite.runNightlyBackup, {})

    expect(outcome).toMatchObject({ stored: true })
    const put = putCall()
    expect(put?.Bucket).toBe("test-bucket")
    expect(put?.Key).toMatch(/^backups\/.*\.json$/)

    // The bytes are the backup, not a manifest describing one.
    const written = JSON.parse(put?.Body as string)
    expect(written.data.stores).toHaveLength(1)
    expect(written.manifest.backupFormatVersion).toBeDefined()
  })

  test("records the off-site copy in the audit log", async () => {
    const t = convexTest(schema, modules)
    await seedSettings(t)
    await seedStore(t)

    await t.action(internal.systemBackupOffsite.runNightlyBackup, {})

    const entries = await t.run((ctx) => ctx.db.query("systemAuditLog").collect())
    const offsite = entries.filter(
      (e) => e.performedBy === "cron" && (e.details ?? "").includes("offsite"),
    )
    expect(offsite).toHaveLength(1)
    expect(offsite[0]?.result).toBe("success")
  })

  test("says so in the audit log when the deployment has no bucket", async () => {
    /* A fresh site or a local `convex dev` legitimately has no bucket, and this
       runs every night forever — so it must not throw. It must not be silent
       either: a client who believes they have nightly backups and has none is
       the failure this exists to end. */
    delete process.env.AWS_S3_BUCKET_NAME
    vi.spyOn(console, "error").mockImplementation(() => {})
    const t = convexTest(schema, modules)

    const outcome = await t.action(internal.systemBackupOffsite.runNightlyBackup, {})

    expect(outcome).toEqual({ stored: false, reason: "not-configured" })
    expect(putCall()).toBeUndefined()

    const entries = await t.run((ctx) => ctx.db.query("systemAuditLog").collect())
    expect(entries.some((e) => e.result === "failure")).toBe(true)
  })

  test("reports a refused S3 write rather than throwing out of the cron", async () => {
    send.mockRejectedValue(new Error("AccessDenied"))
    vi.spyOn(console, "error").mockImplementation(() => {})
    const t = convexTest(schema, modules)
    await seedSettings(t)
    await seedStore(t)

    const outcome = await t.action(internal.systemBackupOffsite.runNightlyBackup, {})

    expect(outcome).toEqual({ stored: false, reason: "upload-failed" })
    const entries = await t.run((ctx) => ctx.db.query("systemAuditLog").collect())
    expect(
      entries.some((e) => e.result === "failure" && (e.errorMessage ?? "").includes("S3")),
    ).toBe(true)
  })

  test("still stores a backup on a deployment that has no settings row yet", async () => {
    /* `_setLastBackupAt` throws when `globalSettings` is missing — a legitimate
       state on a site that has not been through setup. Left unguarded that
       turned a successful export into a failed job, every night, forever. */
    vi.spyOn(console, "error").mockImplementation(() => {})
    const t = convexTest(schema, modules)
    await seedStore(t)

    const outcome = await t.action(internal.systemBackupOffsite.runNightlyBackup, {})

    expect(outcome).toMatchObject({ stored: true })
    expect(putCall()?.Key).toMatch(/^backups\//)
  })

  test("names each night's copy so a listing sorts chronologically", () => {
    // Colons are legal in an S3 key and hostile in a filename; the ISO order
    // has to survive them.
    const first = backupObjectKey(Date.UTC(2026, 8, 7, 1, 30))
    const second = backupObjectKey(Date.UTC(2026, 8, 8, 1, 30))

    expect(first).toBe("backups/2026-09-07T01-30-00-000Z.json")
    expect(first < second).toBe(true)
    expect(first).not.toContain(":")
  })
})
