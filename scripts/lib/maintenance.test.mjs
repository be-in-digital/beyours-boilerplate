import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { assertMaintenanceCurrent } from "./maintenance.mjs"

let root
let exited
let errors
let warnings

function writeSentinel(content) {
  fs.writeFileSync(
    path.join(root, ".beindigital-site.json"),
    JSON.stringify(content),
  )
}

function respond(payload, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 503,
      json: async () => payload,
    })),
  )
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "beyours-maintenance-"))
  exited = []
  errors = []
  warnings = []
  vi.spyOn(process, "exit").mockImplementation((code) => {
    exited.push(code)
  })
  vi.spyOn(console, "error").mockImplementation((m) => errors.push(String(m)))
  vi.spyOn(console, "warn").mockImplementation((m) => warnings.push(String(m)))
  delete process.env.BEYOURS_LICENSE_KEY
  delete process.env.BEYOURS_LICENSE_API
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("assertMaintenanceCurrent", () => {
  /* The monorepo and the boilerplate itself have no sentinel. Their scripts
     must keep working without so much as a network call. */
  test("says nothing on a repo that is not a client site", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(exited).toEqual([])
    expect(warnings).toEqual([])
  })

  /* Sites provisioned before the gate existed carry no key. */
  test("says nothing on a site provisioned before the gate existed", async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    writeSentinel({ name: "Chez Alex", slug: "chez-alex" })
    await assertMaintenanceCurrent({ root, channel: "template" })
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(exited).toEqual([])
  })

  test("lets a site with maintenance up to date through, quietly", async () => {
    writeSentinel({ licenseKey: "bys_x", licenseApi: "https://api.test" })
    respond({ entitled: true, reason: "active", message: "Maintenance à jour." })
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(exited).toEqual([])
    expect(warnings).toEqual([])
  })

  test("warns without blocking while a failed renewal is being retried", async () => {
    writeSentinel({ licenseKey: "bys_x", licenseApi: "https://api.test" })
    respond({
      entitled: true,
      reason: "grace",
      message: "Le dernier paiement de maintenance a échoué.",
    })
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(exited).toEqual([])
    expect(warnings.join(" ")).toContain("échoué")
  })

  test("stops the update once the contract has lapsed, and says how to resume", async () => {
    writeSentinel({ licenseKey: "bys_x", licenseApi: "https://api.test" })
    respond({
      entitled: false,
      reason: "expired",
      site: "chez-alex",
      message: "La maintenance a expiré le 01/01/2026.",
    })
    await assertMaintenanceCurrent({ root, channel: "template" })
    expect(exited).toEqual([1])
    const output = errors.join("\n")
    expect(output).toContain("SUSPENDUE")
    expect(output).toContain("expiré")
    expect(output).toContain("beyours.fr/espace-client")
    expect(output).toContain("chez-alex")
  })

  /* Fail open: our outage must never cost a paying client their update. */
  test("carries on when the contract cannot be reached", async () => {
    writeSentinel({ licenseKey: "bys_x", licenseApi: "https://api.test" })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down")
      }),
    )
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(exited).toEqual([])
    expect(warnings.join(" ")).toContain("invérifiable")
  })

  test("carries on when the API answers an error", async () => {
    writeSentinel({ licenseKey: "bys_x", licenseApi: "https://api.test" })
    respond({}, false)
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(exited).toEqual([])
    expect(warnings.join(" ")).toContain("invérifiable")
  })

  test("the environment overrides what the sentinel holds", async () => {
    writeSentinel({ licenseKey: "bys_stale", licenseApi: "https://api.test" })
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ entitled: true, reason: "active" }),
    }))
    vi.stubGlobal("fetch", fetchSpy)
    process.env.BEYOURS_LICENSE_KEY = "bys_fresh"
    await assertMaintenanceCurrent({ root, channel: "engine" })
    expect(String(fetchSpy.mock.calls[0][0])).toContain("bys_fresh")
  })
})
