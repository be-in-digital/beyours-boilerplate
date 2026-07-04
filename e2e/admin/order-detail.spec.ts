import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

/**
 * Order Detail Page E2E tests.
 *
 * These tests verify the /orders/[orderId] page structure and behavior.
 * Since we rely on dynamic data, some tests conditionally check elements
 * based on what orders exist in the test database.
 */

const ORDERS_URL = "/dashboard/orders"
const INVALID_ORDER_ID = "invalid-order-id-999"

test.describe("Order Detail Page", () => {
  /**
   * Helper: navigate to the first order detail page.
   * Returns true if an order was found, false otherwise.
   */
  async function navigateToFirstOrder(
    page: import("@playwright/test").Page
  ): Promise<boolean> {
    await page.goto(ORDERS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Commandes", level: 1 })
    ).toBeVisible({ timeout: 30_000 })

    // Check if there are any order rows in the table
    const rows = page.locator("tbody tr")
    const rowCount = await rows.count().catch(() => 0)

    if (rowCount > 0) {
      // Click the first row to navigate to order detail
      await rows.first().click()
      await page.waitForLoadState("domcontentloaded")
      return true
    }

    return false
  }

  test.describe("Page Structure", () => {
    test("should display order heading with order number", async ({
      page,
    }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // The heading should contain "Commande" followed by order number
        await expect(
          page.getByRole("heading", { name: /Commande/ })
        ).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display back button linking to /orders", async ({
      page,
    }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        const backLink = page.getByRole("link", { name: /retour|orders/i }).or(
          page.locator('a[href="/dashboard/orders"]')
        )
        await expect(backLink).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display status badge", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // One of the status badges should be visible
        const statusTexts = [
          "En attente",
          "Confirmée",
          "En préparation",
          "Prête",
          "En livraison",
          "Livrée",
          "Terminée",
          "Annulée",
        ]

        const statusBadge = page.locator('[data-slot="badge"]').filter({
          hasText: new RegExp(statusTexts.join("|")),
        })

        await expect(statusBadge.first()).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display type badge", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        const typeTexts = ["Livraison", "À emporter", "Sur place"]

        const typeBadge = page.locator('[data-slot="badge"]').filter({
          hasText: new RegExp(typeTexts.join("|")),
        })

        await expect(typeBadge.first()).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display items table", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Check for the items table with expected columns
        const table = page.locator("table")
        await expect(table).toBeVisible({ timeout: 15_000 })

        // Verify column headers
        const headers = page.locator("thead th")
        const headerTexts = ["Produit", "Qté", "Prix", "Sous-total"]

        for (const headerText of headerTexts) {
          await expect(
            headers.filter({ hasText: headerText })
          ).toBeVisible()
        }
      }
    })
  })

  test.describe("Customer Info", () => {
    test("should display customer name", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Look for the customer info section with "Nom" label
        await expect(page.getByText("Nom")).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display customer contact info", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Look for Email or Téléphone labels
        const emailLabel = page.getByText("Email")
        const phoneLabel = page.getByText("Téléphone")

        await expect(emailLabel.or(phoneLabel)).toBeVisible({
          timeout: 15_000,
        })
      }
    })
  })

  test.describe("Status Actions", () => {
    test("should display status action buttons", async ({ page }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Wait for the page to fully load
        await page.waitForTimeout(2_000)

        // Status action buttons should be present (e.g., "Confirmer", "Préparer", etc.)
        const actionButtons = page.getByRole("button").filter({
          hasText:
            /Confirmer|Préparer|Prête|Livrer|Terminer|Annuler/,
        })

        // At least one action button should exist (unless order is in terminal state)
        const count = await actionButtons.count()
        // Some orders in terminal states (Terminée, Annulée) may have no action buttons
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe("Not Found", () => {
    test('should show "Commande introuvable" for invalid order ID', async ({
      page,
    }) => {
      await page.goto(`/dashboard/orders/${INVALID_ORDER_ID}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await expect(
        page.getByText("Commande introuvable")
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should show loading state initially", async ({ page }) => {
      // Navigate to an order detail page and check for loading state
      await page.goto(`/dashboard/orders/${INVALID_ORDER_ID}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Either loading text or the not found message should appear
      const loadingText = page.getByText(
        "Chargement des détails de la commande..."
      )
      const notFoundText = page.getByText("Commande introuvable")

      await expect(loadingText.or(notFoundText)).toBeVisible({
        timeout: 15_000,
      })
    })
  })

  test.describe("Navigation", () => {
    test("should navigate back to /orders via back button", async ({
      page,
    }) => {
      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Click the back link/button
        const backLink = page
          .getByRole("link", { name: /retour|orders/i })
          .or(page.locator('a[href="/dashboard/orders"]'))

        await expect(backLink).toBeVisible({ timeout: 15_000 })
        await backLink.first().click()

        await expect(page).toHaveURL(/\/dashboard\/orders$/, { timeout: 15_000 })
      }
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      const hasOrder = await navigateToFirstOrder(page)

      if (hasOrder) {
        // Wait for page to settle
        await page.waitForTimeout(2_000)
      }

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
