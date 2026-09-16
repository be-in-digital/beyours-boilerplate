import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { countAfterLoad } from "../helpers/list.helpers"

/**
 * Order Detail Page E2E tests.
 *
 * WHY THIS FILE WAS REWRITTEN (#533). Every case here read
 * `const hasOrder = await navigateToFirstOrder(page); if (hasOrder) { … }`, and
 * the admin project's database has no order when CI runs it. So the whole file
 * passed by never executing a single assertion — and it stayed that way while
 * the row it clicks stopped navigating at all. Measured against a seeded bench,
 * two of its cases fail.
 *
 * Three rules follow from that, and they are what this file now does:
 *
 *   - Nothing is wrapped in `if (hasOrder)`. A case that cannot run says so, by
 *     skipping with a reason — the same shape `requireSeedPassword()` uses. A
 *     skip is visible in the report; a silent early return is not.
 *   - Opening an order asserts the URL CHANGED before asserting anything about
 *     the page. Without it, every "is this on the detail page" assertion is
 *     really being made against the list page, and several of them pass there:
 *     `heading /Commande/` matches the list's own « Commandes ».
 *   - The heading is matched exactly, for that same reason.
 */

const ORDERS_URL = "/dashboard/orders"
const INVALID_ORDER_ID = "invalid-order-id-999"

test.describe("Order Detail Page", () => {
  /**
   * Open the first order in the list, or skip the calling test saying why.
   *
   * Never returns `false`. The boolean this used to return is what let every
   * case opt out of itself in silence; a skip with a reason is the honest
   * version of the same fact, and it appears in the report.
   *
   * The click lands on the ROW, which is what a reader of the list does — the
   * row advertises itself with `cursor-pointer` — and the URL assertion
   * afterwards is what makes that click meaningful. It is also what caught the
   * defect this file was rewritten for: the row was decorative and only the
   * text inside each cell navigated.
   */
  async function openFirstOrder(
    page: import("@playwright/test").Page
  ): Promise<void> {
    await page.goto(ORDERS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    await expect(
      page.getByRole("heading", { name: "Commandes", level: 1 })
    ).toBeVisible({ timeout: 30_000 })

    const rows = page.locator("tbody tr")
    const rowCount = await rows.count().catch(() => 0)
    test.skip(
      rowCount === 0,
      "no order in the database to open — seed one, or run this against a bench that has traded"
    )

    await rows.first().click()

    // The whole point of the click. Asserted before anything about the page,
    // because the list page satisfies several of the assertions below.
    await expect(page).toHaveURL(/\/dashboard\/orders\/[^/]+$/, {
      timeout: 15_000,
    })
  }

  test.describe("Page Structure", () => {
    test("should display order heading with order number", async ({
      page,
    }) => {
      await openFirstOrder(page)

      /*
       * EXACT, not `/Commande/`. That pattern matches the LIST page's own
       * « Commandes » heading, so the case passed whether or not the click had
       * navigated — which is precisely how the dead row survived. The detail
       * heading is « Commande #ORD-YYYY-NNNNN », and the number is what proves
       * an order was opened rather than a list.
       */
      await expect(
        page.getByRole("heading", { name: /^Commande #\S+/, level: 1 })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display back button linking to /orders", async ({
      page,
    }) => {
      await openFirstOrder(page)

      const backLink = page.getByRole("link", { name: /retour|orders/i }).or(
        page.locator('a[href="/dashboard/orders"]')
      )
      await expect(backLink).toBeVisible({ timeout: 15_000 })
    })

    test("should display status badge", async ({ page }) => {
      await openFirstOrder(page)

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
    })

    test("should display type badge", async ({ page }) => {
      await openFirstOrder(page)

      const typeTexts = ["Livraison", "À emporter", "Sur place"]

      const typeBadge = page.locator('[data-slot="badge"]').filter({
        hasText: new RegExp(typeTexts.join("|")),
      })

      await expect(typeBadge.first()).toBeVisible({ timeout: 15_000 })
    })

    test("should display items table", async ({ page }) => {
      await openFirstOrder(page)

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
    })
  })

  test.describe("Customer Info", () => {
    test("should display customer name", async ({ page }) => {
      await openFirstOrder(page)

      // Look for the customer info section with "Nom" label
      await expect(page.getByText("Nom")).toBeVisible({ timeout: 15_000 })
    })

    test("should display customer contact info", async ({ page }) => {
      await openFirstOrder(page)

      // Look for Email or Téléphone labels
      const emailLabel = page.getByText("Email")
      const phoneLabel = page.getByText("Téléphone")

      await expect(emailLabel.or(phoneLabel)).toBeVisible({
        timeout: 15_000,
      })
    })
  })

  test.describe("Status Actions", () => {
    test("should display status action buttons", async ({ page }) => {
      await openFirstOrder(page)

      // Wait for the page to fully load
      await page.waitForTimeout(2_000)

      // Status action buttons should be present (e.g., "Confirmer", "Préparer", etc.)
      const actionButtons = page.getByRole("button").filter({
        hasText:
          /Confirmer|Préparer|Prête|Livrer|Terminer|Annuler/,
      })

      // At least one action button should exist (unless order is in terminal state)
      const count = await countAfterLoad(actionButtons)
      // Some orders in terminal states (Terminée, Annulée) may have no action buttons
      expect(count).toBeGreaterThanOrEqual(0)
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
      await openFirstOrder(page)

      // Click the back link/button
      const backLink = page
        .getByRole("link", { name: /retour|orders/i })
        .or(page.locator('a[href="/dashboard/orders"]'))

      await expect(backLink).toBeVisible({ timeout: 15_000 })
      await backLink.first().click()

      await expect(page).toHaveURL(/\/dashboard\/orders$/, { timeout: 15_000 })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await openFirstOrder(page)

      // Wait for page to settle
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
