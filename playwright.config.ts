import { defineConfig, devices } from "@playwright/test"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

// Load .env.local so NEXT_PUBLIC_* vars are available to test files
const envLocalPath = resolve(__dirname, ".env.local")
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, "utf-8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    const value = trimmed.slice(eqIdx + 1)
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json"

// Admin/setup projects require a real Convex backend (not placeholder URLs).
// In CI with placeholder URLs we only run the "public" project.
//
// Spelled out rather than `!url?.includes("placeholder")`: that reads as "no
// placeholder, so a real backend", but on an UNSET variable it is `!undefined`
// — true — and claims a backend that was never configured. Unset is the one
// case where we know there is nothing to talk to.
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
const hasRealBackend = convexUrl !== "" && !convexUrl.includes("placeholder")

// Dropping 43 of 56 spec files should never be silent. The projects below are
// spread out of the array when there is no backend, so they are not reported as
// skipped — they are absent, and the run looks complete. Say so here, and let
// scripts/assert-e2e-ran.mjs fail the job on it in CI.
if (!hasRealBackend) {
  console.warn(
    `[e2e] NEXT_PUBLIC_CONVEX_URL is ${convexUrl === "" ? "unset" : `"${convexUrl}"`} — ` +
      `the "setup" and "admin" projects are NOT declared. Only public tests will run.`
  )
}

/**
 * The port the suite drives, and the port the server it starts listens on.
 *
 * Hardcoded 3000, this suite could not be pointed anywhere else: in a worktree
 * the sibling checkout already holds that port, so Playwright either reused a
 * server built from somebody else's branch or died on "Another next dev server
 * is already running" before a single test ran. Same shape as
 * `apps/reference/playwright.config.ts`, deliberately.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker, everywhere — the same setting `apps/reference` already carries.
  //
  // This file kept `CI ? 1 : 2` long after the bench had abandoned it, and
  // nothing caught the difference: the engine's CI runs `--filter=@beyours/reference`,
  // so the template's suite is only ever run by hand, or by a client.
  //
  // Two workers are two processes against ONE Next server and ONE Convex
  // deployment, and `fullyParallel` splits a single file across them. A spec
  // that seeds through the app's own functions then seeds twice: measured on
  // `admin/payments-refund.spec.ts`, where both workers looked up the store's
  // payments, both found none, and both inserted — two rows of 42,42 € and two
  // of 13,37 €, so `toHaveCount(1)` failed six tests out of seven. Nothing was
  // wrong with the product or the spec; the run had simply seeded itself twice.
  workers: 1,
  // JSON alongside HTML: the HTML report is for a human opening the artifact,
  // the JSON is what scripts/assert-e2e-ran.mjs reads to prove tests actually
  // ran. Playwright exits 0 over an empty run, so something has to count.
  reporter: [["html"], ["json", { outputFile: "playwright-report/report.json" }]],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
  },
  projects: [
    // Auth setup — runs first, saves browser state for admin tests
    ...(hasRealBackend
      ? [
          {
            name: "setup",
            testMatch: /auth\.setup\.ts/,
            retries: 2,
          },
        ]
      : []),
    // Tests that don't need authentication
    {
      name: "public",
      testMatch: [
        /auth\/.+\.spec\.ts/,
        /storefront\/.+\.spec\.ts/,
        // The player route is unauthenticated by design: a customer scans a
        // table QR code and plays. It belongs in this project, not `admin`.
        /game\/.+\.spec\.ts/,
        /auth-responsive\.spec\.ts/,
        /auth-a11y\.spec\.ts/,
        /address-autocomplete\.spec\.ts/,
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    // Admin tests that need authentication (skipped without real backend)
    ...(hasRealBackend
      ? [
          {
            name: "admin",
            dependencies: ["setup"],
            testMatch: [
              /admin\/.+\.spec\.ts/,
              /cms\/.+\.spec\.ts/,
              /navigation\/.+\.spec\.ts/,
              /admin-responsive\.spec\.ts/,
              /admin-a11y\.spec\.ts/,
            ],
            use: {
              ...devices["Desktop Chrome"],
              storageState: ADMIN_STORAGE_STATE,
            },
          },
        ]
      : []),
  ],
  webServer: {
    // A production server in CI, a dev server locally.
    //
    // Turbopack compiles each route the first time it is requested, and in dev
    // that costs ten to twenty seconds — longer than most of these tests are
    // allowed to live. It produced failures that looked like defects and were
    // not: `/dashboard` refused to redirect an anonymous visitor within 15 s on
    // a cold server, and redirected in 4.6 s on the next run. Every one of
    // those "failures" disappeared on a second pass.
    //
    // CI already runs `pnpm build`, so it should serve that build rather than
    // recompile page by page. `E2E_USE_BUILD=true` gets the same locally.
    command:
      process.env.CI || process.env.E2E_USE_BUILD === "true"
        ? `pnpm start --port ${PORT}`
        : `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([, v]) => v !== undefined
      ) as [string, string][]
    ),
  },
})
