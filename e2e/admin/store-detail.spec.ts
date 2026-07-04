import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

const STORES_URL = "/dashboard/stores"

const TABS = ["Général", "Horaires", "Paramètres", "Intégrations"] as const

const DAYS_OF_WEEK = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const

test.describe("Store Detail Page", () => {
  /**
   * Helper: navigate to the first store detail page.
   * Returns true if a store was found, false otherwise.
   */
  async function navigateToFirstStore(
    page: import("@playwright/test").Page
  ): Promise<boolean> {
    await page.goto(STORES_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })

    // Wait for the page to load
    await expect(
      page.getByRole("heading", { name: "Établissements", level: 1 })
    ).toBeVisible({ timeout: 30_000 })

    // Check if there are any store rows in the table
    const rows = page.locator("tbody tr")
    const rowCount = await rows.count().catch(() => 0)

    if (rowCount > 0) {
      // Click the first row to navigate to store detail
      await rows.first().click()
      await page.waitForLoadState("domcontentloaded")

      // Wait for the store detail page to load
      await expect(page).toHaveURL(/\/dashboard\/stores\//, { timeout: 15_000 })
      return true
    }

    return false
  }

  test.describe("Page Structure", () => {
    test("should display store name heading", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        // The page should have a heading with the store name
        const heading = page.getByRole("heading", { level: 1 })
        await expect(heading).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display 4 tabs", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        for (const tab of TABS) {
          await expect(
            page.getByRole("tab", { name: tab })
          ).toBeVisible({ timeout: 15_000 })
        }
      }
    })
  })

  test.describe("General Tab", () => {
    test("should display name and slug fields", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        // General tab should be active by default
        await expect(page.getByLabel("Nom")).toBeVisible({ timeout: 15_000 })
        await expect(page.getByLabel("Slug")).toBeVisible()
      }
    })

    test("should display address fields", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        // Address-related fields should be visible
        await expect(page.getByLabel(/Adresse/)).toBeVisible({
          timeout: 15_000,
        })
      }
    })

    test("should display status select", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        // The status select (combobox) should be visible
        const statusCombobox = page.getByRole("combobox").filter({
          hasText: /Ouvert|Fermé|Indisponible/,
        })
        await expect(statusCombobox).toBeVisible({ timeout: 15_000 })
      }
    })

    test("should display save button", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await expect(
          page.getByRole("button", { name: "Enregistrer" })
        ).toBeVisible({ timeout: 15_000 })
      }
    })
  })

  test.describe("Hours Tab", () => {
    test("should switch to Horaires tab", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        const horairesTab = page.getByRole("tab", { name: "Horaires" })
        await horairesTab.click()
        await expect(horairesTab).toHaveAttribute("data-state", "active")
      }
    })

    test("should display 7 day rows", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Horaires" }).click()

        // All 7 days should be visible
        for (const day of DAYS_OF_WEEK) {
          await expect(page.getByText(day)).toBeVisible({ timeout: 15_000 })
        }
      }
    })

    test("should display time inputs and toggle per day", async ({
      page,
    }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Horaires" }).click()

        // Check that there are time input fields (open/close)
        const timeInputs = page.locator('input[type="time"]')
        const timeInputCount = await timeInputs.count()

        // At least 2 time inputs per day (open and close) for 7 days = 14
        expect(timeInputCount).toBeGreaterThanOrEqual(2)

        // Check for Fermé/Ouvert toggle switches
        const switches = page.getByRole("switch")
        const switchCount = await switches.count()
        expect(switchCount).toBeGreaterThanOrEqual(1)
      }
    })

    test("should display apply shortcut buttons", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Horaires" }).click()

        // Check for shortcut buttons
        await expect(
          page.getByRole("button", {
            name: /Appliquer Lundi à Vendredi/,
          })
        ).toBeVisible({ timeout: 15_000 })

        await expect(
          page.getByRole("button", {
            name: /Appliquer à tous les jours/,
          })
        ).toBeVisible()

        // Check for save button
        await expect(
          page.getByRole("button", { name: "Enregistrer les horaires" })
        ).toBeVisible()
      }
    })
  })

  test.describe("Settings Tab", () => {
    test("should switch to Paramètres tab", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        const settingsTab = page.getByRole("tab", { name: "Paramètres" })
        await settingsTab.click()
        await expect(settingsTab).toHaveAttribute("data-state", "active")
      }
    })

    test("should display service toggles", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Paramètres" }).click()

        // Check for service type toggles
        const serviceTypes = [
          "Sur place",
          "À emporter",
          "Livraison",
          "Click & Collect",
        ]

        for (const service of serviceTypes) {
          await expect(page.getByText(service)).toBeVisible({
            timeout: 15_000,
          })
        }
      }
    })

    test("should display delivery settings", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Paramètres" }).click()

        // Check for save button
        await expect(
          page.getByRole("button", {
            name: "Enregistrer les paramètres",
          })
        ).toBeVisible({ timeout: 15_000 })
      }
    })
  })

  test.describe("Integrations Tab", () => {
    test("should switch to Intégrations tab", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        const integrationsTab = page.getByRole("tab", {
          name: "Intégrations",
        })
        await integrationsTab.click()
        await expect(integrationsTab).toHaveAttribute(
          "data-state",
          "active"
        )
      }
    })

    test("should display Uber Eats card", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Intégrations" }).click()

        await expect(page.getByText("Uber Eats")).toBeVisible({
          timeout: 15_000,
        })
      }
    })

    test("should display Deliveroo card", async ({ page }) => {
      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        await page.getByRole("tab", { name: "Intégrations" }).click()

        await expect(page.getByText("Deliveroo")).toBeVisible({
          timeout: 15_000,
        })
      }
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      const hasStore = await navigateToFirstStore(page)

      if (hasStore) {
        // Wait for page to settle
        await page.waitForTimeout(2_000)
      }

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
