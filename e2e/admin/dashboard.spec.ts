import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import {
  waitForAdminPage,
  navigateViaSidebar,
} from "../helpers/navigation.helpers"

test.describe("Dashboard Page", () => {
  test.describe("Page Loading", () => {
    test("should load dashboard after authentication", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      // The dashboard should be visible with main content
      await expect(page.locator("main")).toBeVisible()
    })

    test("should display skeleton while data loads", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Either the skeleton or the loaded content should appear
      const skeleton = page.locator(".animate-pulse")
      const mainContent = page.locator("main")

      await expect(skeleton.first().or(mainContent)).toBeVisible({
        timeout: 15_000,
      })
    })
  })

  test.describe("Page Structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display stat cards section", async ({ page }) => {
      // Expect at least 4 stat cards (revenue, order count, average basket, active orders)
      const statCards = page.locator('[data-slot="card"]')
      await expect(statCards.first()).toBeVisible({ timeout: 15_000 })

      const count = await statCards.count()
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test("should display chart section", async ({ page }) => {
      // The recharts bar chart container or a section heading for the chart
      const chartSection = page
        .locator(".recharts-responsive-container")
        .or(page.getByText("Commandes des 7 derniers jours"))
        .or(page.getByText("Commandes"))

      await expect(chartSection.first()).toBeVisible({ timeout: 15_000 })
    })

    test("should display order breakdown section", async ({ page }) => {
      // Order breakdown shows categories like Livraison, À emporter, Sur place
      const breakdownSection = page
        .getByText("Livraison")
        .or(page.getByText("À emporter"))
        .or(page.getByText("Sur place"))

      await expect(breakdownSection.first()).toBeVisible({ timeout: 15_000 })
    })

    test("should display recent orders table", async ({ page }) => {
      // The recent orders section should have a table or an empty state
      const ordersTable = page.locator("table")
      const emptyState = page.getByText("Aucune commande")

      await expect(ordersTable.or(emptyState)).toBeVisible({ timeout: 15_000 })
    })

    test("should display quick actions section", async ({ page }) => {
      // Quick actions section with action buttons/links
      const quickActions = page
        .getByText("Actions rapides")
        .or(page.getByRole("link", { name: /produit/i }))

      await expect(quickActions.first()).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Stats", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display numeric values in stat cards", async ({ page }) => {
      // Stat cards should contain numeric values (currency, count, etc.)
      const statCards = page.locator('[data-slot="card"]')
      await expect(statCards.first()).toBeVisible({ timeout: 15_000 })

      // At least one card should contain a number or currency symbol
      const cardTexts = await statCards.allTextContents()
      const hasNumericValue = cardTexts.some((text) => /\d/.test(text))
      expect(hasNumericValue).toBe(true)
    })

    test("should display 7-day chart with day labels", async ({ page }) => {
      // The chart should have day labels (Mon, Tue... or Lun, Mar... in French)
      const chartContainer = page.locator(".recharts-responsive-container")

      // Either the chart renders or we see day labels in the chart area
      const chartOrLabels = chartContainer.or(
        page.getByText(/Lun|Mar|Mer|Jeu|Ven|Sam|Dim/)
      )
      await expect(chartOrLabels.first()).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Recent Orders", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display table with order data or empty state", async ({
      page,
    }) => {
      const ordersTable = page.locator("table")
      const emptyState = page.getByText("Aucune commande")

      await expect(ordersTable.or(emptyState)).toBeVisible({ timeout: 15_000 })

      // If table is visible, it should have at most 10 rows
      if (await ordersTable.isVisible()) {
        const rowCount = await page.locator("tbody tr").count()
        expect(rowCount).toBeLessThanOrEqual(10)
      }
    })

    test("should display order number, customer, amount in table", async ({
      page,
    }) => {
      const ordersTable = page.locator("table")
      const emptyState = page.getByText("Aucune commande")

      await expect(ordersTable.or(emptyState)).toBeVisible({ timeout: 15_000 })

      // If table exists with rows, check for expected column content
      if (await ordersTable.isVisible()) {
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount > 0) {
          // First row should contain data cells
          const firstRow = rows.first()
          const cells = firstRow.locator("td")
          const cellCount = await cells.count()
          expect(cellCount).toBeGreaterThanOrEqual(3)
        }
      }
    })
  })

  test.describe("Navigation", () => {
    test('should be accessible via sidebar "Vue d\'ensemble"', async ({
      page,
    }) => {
      // Navigate to a different page first
      await page.goto("/dashboard/products", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Navigate back to dashboard via sidebar
      await navigateViaSidebar(page, "Vue d'ensemble")

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Wait a bit for any async operations to complete
      await page.waitForTimeout(3_000)

      cleanup()

      const errors = getErrors()
      expect(errors).toEqual([])
    })
  })
})
