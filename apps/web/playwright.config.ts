import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the storefront E2E suite.
 *
 * The dev server is started by Playwright via `webServer` and reused
 * across tests. Locally, the server runs in dev mode (Turbopack) for
 * fast iteration. In CI, you can swap to `pnpm start` after a build.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "PORT=3001 pnpm dev",
        url: "http://localhost:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
