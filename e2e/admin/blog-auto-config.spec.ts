import { test, expect } from "@playwright/test"
import { waitForAdminPage } from "../helpers/navigation.helpers"

test.describe("Blog Auto Config", () => {
  test.describe("Page Loading", () => {
    test("should load auto-config page", async ({ page }) => {
      await page.goto("/dashboard/content/blog/auto-config", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      // Should display the auto-config heading or form
      await expect(
        page
          .getByRole("heading", { name: /auto|configuration|param[eè]tres/i })
          .or(page.getByText(/configuration automatique/i))
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display frequency selector", async ({ page }) => {
      await page.goto("/dashboard/content/blog/auto-config", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      // Should have frequency radio/select (hebdomadaire/mensuel)
      await expect(
        page
          .getByText(/fr[eé]quence|hebdomadaire|mensuel/i)
          .first()
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display themes/topics section", async ({ page }) => {
      await page.goto("/dashboard/content/blog/auto-config", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      // Should have themes/topics input area
      await expect(
        page
          .getByText(/th[eé]matiques?|sujets?|topics?/i)
          .first()
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display approval mode selector", async ({ page }) => {
      await page.goto("/dashboard/content/blog/auto-config", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      // Should have approval mode (brouillon / auto-publication)
      await expect(
        page
          .getByText(/approbation|brouillon|publication/i)
          .first()
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display save button", async ({ page }) => {
      await page.goto("/dashboard/content/blog/auto-config", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await expect(
        page.getByRole("button", { name: /enregistrer|sauvegarder|save/i })
      ).toBeVisible({ timeout: 15_000 })
    })
  })
})
