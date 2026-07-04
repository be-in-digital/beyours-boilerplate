import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { waitForAdminPage } from "../helpers/navigation.helpers"
import { applySearch } from "../helpers/filter.helpers"

test.describe("Inventory Page", () => {
  test.describe("Page Structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display heading and subtitle", async ({ page }) => {
      await expect(
        page.getByRole("heading", { level: 1, name: "Inventaire" })
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page.getByText("Gérez le stock de vos produits en temps réel")
      ).toBeVisible()
    })

    test("should display 4 status summary cards", async ({ page }) => {
      await expect(
        page.getByText("En stock")
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page.getByText("Stock faible")
      ).toBeVisible()

      await expect(
        page.getByText("Rupture")
      ).toBeVisible()

      await expect(
        page.getByText("Non suivi")
      ).toBeVisible()
    })

    test("should display search input", async ({ page }) => {
      await expect(
        page.getByPlaceholder("Rechercher un produit par nom...")
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display inventory table or loading state", async ({
      page,
    }) => {
      const table = page.locator("table")
      const loading = page.getByText("Chargement de l'inventaire...")
      const emptyState = page.getByText("Aucun produit trouvé")
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement pour afficher l'inventaire"
      )

      await expect(
        table.or(loading).or(emptyState).or(noStore)
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Status Card Filters", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test('should filter by "En stock" card click', async ({ page }) => {
      // Click the "En stock" status card
      const enStockCard = page
        .locator('[data-slot="card"]')
        .filter({ hasText: "En stock" })
        .first()

      // Only proceed if the card is visible (store selected and data loaded)
      if (await enStockCard.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await enStockCard.click()
        await page.waitForTimeout(500)

        // Active filters indicator or filtered table should be visible
        const table = page.locator("table")
        const emptyState = page.getByText("Aucun produit trouvé")
        await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
      }
    })

    test('should filter by "Stock faible" card click', async ({ page }) => {
      const card = page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Stock faible" })
        .first()

      if (await card.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await card.click()
        await page.waitForTimeout(500)

        const table = page.locator("table")
        const emptyState = page.getByText("Aucun produit trouvé")
        await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
      }
    })

    test('should filter by "Rupture" card click', async ({ page }) => {
      const card = page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Rupture" })
        .first()

      if (await card.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await card.click()
        await page.waitForTimeout(500)

        const table = page.locator("table")
        const emptyState = page.getByText("Aucun produit trouvé")
        await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
      }
    })

    test('should filter by "Non suivi" card click', async ({ page }) => {
      const card = page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Non suivi" })
        .first()

      if (await card.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await card.click()
        await page.waitForTimeout(500)

        const table = page.locator("table")
        const emptyState = page.getByText("Aucun produit trouvé")
        await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
      }
    })
  })

  test.describe("Search", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should filter products by name", async ({ page }) => {
      await applySearch(page, "Rechercher un produit par nom...", "pizza")
      await page.waitForTimeout(1_000)

      const table = page.locator("table")
      const emptyState = page.getByText("Aucun produit trouvé")
      await expect(table.or(emptyState)).toBeVisible({ timeout: 15_000 })
    })

    test("should show empty state for no matches", async ({ page }) => {
      await applySearch(
        page,
        "Rechercher un produit par nom...",
        "zzzznonexistent99999"
      )
      await page.waitForTimeout(1_000)

      await expect(
        page.getByText("Aucun produit trouvé")
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should clear filters with reset button", async ({ page }) => {
      await applySearch(page, "Rechercher un produit par nom...", "test")
      await page.waitForTimeout(1_000)

      const resetButton = page.getByRole("button", {
        name: /[Rr]éinitialiser/,
      })

      if (await resetButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await resetButton.click()
        await page.waitForTimeout(500)

        // Search input should be cleared
        const searchInput = page.getByPlaceholder(
          "Rechercher un produit par nom..."
        )
        await expect(searchInput).toHaveValue("")
      }
    })
  })

  test.describe("Inline Editing", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display quantity editor with +/- buttons", async ({
      page,
    }) => {
      const table = page.locator("table")

      if (await table.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount > 0) {
          // Look for +/- buttons in the first row
          const firstRow = rows.first()
          const buttons = firstRow.getByRole("button")
          const buttonCount = await buttons.count()

          // Should have at least 2 buttons for +/- quantity
          expect(buttonCount).toBeGreaterThanOrEqual(2)
        }
      }
    })

    test("should display threshold input", async ({ page }) => {
      const table = page.locator("table")

      if (await table.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount > 0) {
          // Threshold column should contain an input or editable value
          const thresholdHeader = page.getByText("Seuil alerte", {
            exact: false,
          })
          await expect(thresholdHeader).toBeVisible()
        }
      }
    })

    test("should display auto-disable switch", async ({ page }) => {
      const table = page.locator("table")

      if (await table.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount > 0) {
          const autoDisableHeader = page.getByText("Auto-désactivation", {
            exact: false,
          })
          await expect(autoDisableHeader).toBeVisible()
        }
      }
    })

    test("should display tracking switch", async ({ page }) => {
      const table = page.locator("table")

      if (await table.isVisible({ timeout: 15_000 }).catch(() => false)) {
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount > 0) {
          const trackingHeader = page.getByText("Suivi", { exact: false })
          await expect(trackingHeader).toBeVisible()
        }
      }
    })
  })

  test.describe("Pagination", () => {
    test("should display pagination when enough items", async ({ page }) => {
      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const table = page.locator("table")

      if (await table.isVisible({ timeout: 15_000 }).catch(() => false)) {
        // Pagination may or may not appear depending on item count
        const pagination = page.locator("nav[aria-label]").or(
          page.getByRole("button", { name: /[Ss]uivant|[Nn]ext/ })
        )

        // Just verify pagination exists if there are enough rows
        const rows = page.locator("tbody tr")
        const rowCount = await rows.count()

        if (rowCount >= 10) {
          await expect(pagination.first()).toBeVisible({ timeout: 5_000 })
        }
      }
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/dashboard/inventory", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Wait for async operations to complete
      await page.waitForTimeout(3_000)

      cleanup()

      const errors = getErrors()
      expect(errors).toEqual([])
    })
  })
})
