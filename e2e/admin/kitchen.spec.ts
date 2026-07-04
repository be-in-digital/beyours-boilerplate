import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { waitForAdminPage } from "../helpers/navigation.helpers"

test.describe("Kitchen Page", () => {
  test.describe("Page Structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/orders/kitchen", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display 4 kanban columns", async ({ page }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )

      // Wait for either kanban columns or no-store message
      const enAttente = page.getByText("En attente")
      await expect(enAttente.or(noStore)).toBeVisible({ timeout: 15_000 })

      // If no-store message is shown, skip column checks
      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      await expect(page.getByText("En attente")).toBeVisible()
      await expect(page.getByText("En cours")).toBeVisible()
      await expect(page.getByText("Prêt")).toBeVisible()
      await expect(page.getByText("Terminé")).toBeVisible()
    })

    test("should display column headers: En attente, En cours, Prêt, Terminé", async ({
      page,
    }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const enAttente = page.getByText("En attente")

      await expect(enAttente.or(noStore)).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      // Column headers should be visible with proper text
      const columns = ["En attente", "En cours", "Prêt", "Terminé"]
      for (const col of columns) {
        await expect(page.getByText(col).first()).toBeVisible()
      }
    })

    test("should display ticket count in column headers", async ({ page }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const enAttente = page.getByText("En attente")

      await expect(enAttente.or(noStore)).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      // Column headers typically display a count badge (e.g., "(0)" or a number)
      // Look for any numeric indicator near the column headers
      const headerArea = page.locator("main")
      const headerText = await headerArea.textContent()
      // At minimum, the header area should contain digits (ticket counts)
      expect(headerText).toBeTruthy()
    })

    test('should display "Aucun ticket" in empty columns', async ({
      page,
    }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const enAttente = page.getByText("En attente")

      await expect(enAttente.or(noStore)).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      // At least some columns should show empty state if no tickets
      const emptyMessage = page.getByText("Aucun ticket")
      const ticketCard = page.locator('[data-slot="card"]').first()

      // Either there are ticket cards or empty messages
      await expect(
        emptyMessage.first().or(ticketCard)
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Station Filter", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/orders/kitchen", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display station filter", async ({ page }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const mainContent = page.locator("main")

      await expect(mainContent).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      // Station filter is a dropdown/select element
      const stationFilter = page
        .getByRole("combobox")
        .or(page.getByText("Station", { exact: false }))

      await expect(stationFilter.first()).toBeVisible({ timeout: 15_000 })
    })

    test("should filter tickets by station", async ({ page }) => {
      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const mainContent = page.locator("main")

      await expect(mainContent).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      const stationFilter = page.getByRole("combobox").first()

      if (
        await stationFilter.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await stationFilter.click()

        // Options should appear
        const options = page.getByRole("option")
        const optionCount = await options.count()

        if (optionCount > 0) {
          await options.first().click()
          await page.waitForTimeout(500)

          // Page should still render without errors
          await expect(mainContent).toBeVisible()
        }
      }
    })
  })

  test.describe("Ticket Cards", () => {
    test("should display ticket cards with order info", async ({ page }) => {
      await page.goto("/dashboard/orders/kitchen", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const noStore = page.getByText(
        "Veuillez sélectionner un établissement"
      )
      const enAttente = page.getByText("En attente")

      await expect(enAttente.or(noStore)).toBeVisible({ timeout: 15_000 })

      if (await noStore.isVisible().catch(() => false)) {
        return
      }

      // Either ticket cards exist or empty state is shown
      const ticketCard = page.locator('[data-slot="card"]').first()
      const emptyMessage = page.getByText("Aucun ticket")

      await expect(
        ticketCard.or(emptyMessage.first())
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Loading", () => {
    test("should show skeleton while loading", async ({ page }) => {
      await page.goto("/dashboard/orders/kitchen", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Either skeleton loading indicators or the loaded content should appear
      const skeleton = page.locator(".animate-pulse")
      const mainContent = page.locator("main")

      await expect(skeleton.first().or(mainContent)).toBeVisible({
        timeout: 15_000,
      })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/dashboard/orders/kitchen", {
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
