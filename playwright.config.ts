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
  workers: process.env.CI ? 1 : 2,
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
