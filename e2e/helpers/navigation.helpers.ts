import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

/**
 * Wait for the admin layout to be fully loaded.
 * The admin layout includes a sidebar and a store selector.
 */
export async function waitForAdminPage(page: Page, timeout = 30_000) {
  // Wait for the sidebar to be visible (admin layout indicator)
  // Use .first() to avoid strict mode violation when multiple sidebar elements exist
  await expect(
    page.locator('[data-slot="sidebar"]').first()
  ).toBeVisible({ timeout })

  // Wait for loading spinners/skeletons to disappear
  await waitForConvexData(page, timeout)
}

/**
 * Wait for Convex data to load by waiting for loading indicators to disappear.
 */
export async function waitForConvexData(page: Page, timeout = 30_000) {
  // Wait for any loading text to disappear
  const loadingIndicators = page.locator(
    'text="Chargement", .animate-pulse, .animate-spin'
  )

  try {
    await loadingIndicators.first().waitFor({ state: "hidden", timeout })
  } catch {
    // No loading indicators found, data may already be loaded
  }
}

/**
 * Navigate to an admin page via the sidebar.
 */
export async function navigateViaSidebar(page: Page, label: string) {
  const sidebarLink = page
    .locator('[data-slot="sidebar"]')
    .getByRole("link", { name: label })

  await sidebarLink.click()
  await page.waitForLoadState("domcontentloaded")
}

/**
 * Navigate to a collapsible sidebar item by expanding the parent first.
 */
export async function navigateToCollapsibleItem(
  page: Page,
  parentLabel: string,
  childLabel: string
) {
  // Click the collapsible parent to expand it
  const parent = page
    .locator('[data-slot="sidebar"]')
    .getByRole("button", { name: parentLabel })

  await parent.click()

  // Wait for the child link to appear
  const childLink = page
    .locator('[data-slot="sidebar"]')
    .getByRole("link", { name: childLabel })

  await expect(childLink).toBeVisible({ timeout: 5_000 })
  await childLink.click()
  await page.waitForLoadState("domcontentloaded")
}
