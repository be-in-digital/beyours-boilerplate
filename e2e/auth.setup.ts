import { test as setup, expect } from "@playwright/test"

/**
 * Authentication setup for admin E2E tests.
 *
 * Logs in as the test admin user (client_admin role) and saves the
 * browser storage state so subsequent tests can reuse the session.
 *
 * Requires:
 *   - A running Convex backend with seeded users (npx tsx scripts/seed-users.mts)
 *   - NEXT_PUBLIC_CONVEX_URL in .env.local
 */

const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json"

setup("authenticate as admin", async ({ page }) => {
  // Wait for full network idle to ensure Convex backend is connected
  await page.goto("/sign-in", {
    waitUntil: "networkidle",
    timeout: 60_000,
  })

  await expect(
    page.getByText("Bon retour").or(page.getByRole("heading", { name: "Connexion" }))
  ).toBeVisible({ timeout: 30_000 })

  // Wait for Next.js compilation to finish (dev mode indicator)
  const compilingIndicator = page.getByText("Compiling")
  try {
    await compilingIndicator.waitFor({ state: "hidden", timeout: 30_000 })
  } catch {
    // Indicator may not appear if already compiled
  }

  // Extra wait for Convex WebSocket connection to stabilize
  await page.waitForLoadState("networkidle")

  // Fill credentials using input IDs (labels are ambiguous due to "Mot de passe oublié" link)
  await page.locator("#email").fill("test.owner@beindigital.fr")
  await page.locator("#password").fill("julien")

  await page.getByRole("button", { name: /se connecter/i }).click()

  // Wait for auth API response before checking URL
  await page.waitForLoadState("networkidle", { timeout: 30_000 })

  // After login, the app redirects to /menu or /dashboard
  await expect(page).toHaveURL(/\/(dashboard|menu)/, { timeout: 60_000 })

  await page.context().storageState({ path: ADMIN_STORAGE_STATE })
})
