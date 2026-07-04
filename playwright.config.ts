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
const hasRealBackend = !process.env.NEXT_PUBLIC_CONVEX_URL?.includes("placeholder")

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: "html",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://localhost:3000",
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
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([, v]) => v !== undefined
      ) as [string, string][]
    ),
  },
})
