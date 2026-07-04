import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { waitForAdminPage } from "../helpers/navigation.helpers"
import {
  waitForDialog,
  closeDialogByCancel,
  getDialog,
} from "../helpers/dialog.helpers"

test.describe("Games Page", () => {
  test.describe.configure({ mode: "serial" })

  test.describe("Page Structure", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should display heading and subtitle", async ({ page }) => {
      await expect(
        page.getByRole("heading", { level: 1, name: "Jeux et Gamification" })
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page.getByText("Engagez vos clients avec des jeux interactifs")
      ).toBeVisible()
    })

    test("should display 4 tabs", async ({ page }) => {
      await expect(
        page.getByRole("tab", { name: "Configuration" })
      ).toBeVisible({ timeout: 15_000 })
      await expect(
        page.getByRole("tab", { name: "Codes QR" })
      ).toBeVisible()
      await expect(
        page.getByRole("tab", { name: "Prix" })
      ).toBeVisible()
      await expect(
        page.getByRole("tab", { name: "Historique" })
      ).toBeVisible()
    })
  })

  test.describe("Configuration Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test('should display "Créer un jeu" button', async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Créer un jeu" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should show games or empty state", async ({ page }) => {
      // Either game cards exist or an empty state is shown
      const gameCard = page.locator('[data-slot="card"]').first()
      const emptyState = page.getByText("Aucun jeu")

      await expect(gameCard.or(emptyState)).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Create Game Dialog", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should open dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un jeu" }).click()
      const dialog = await waitForDialog(page)

      await expect(dialog.getByText("Nouveau jeu")).toBeVisible()
    })

    test("should display form fields (name, type, description, ratio slider)", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Créer un jeu" }).click()
      const dialog = await waitForDialog(page)

      // Name field
      await expect(dialog.getByLabel("Nom du jeu")).toBeVisible()

      // Type select
      await expect(dialog.getByText("Type", { exact: false })).toBeVisible()

      // Description field
      await expect(dialog.getByLabel("Description")).toBeVisible()

      // Win ratio slider
      await expect(
        dialog.getByText("Ratio de victoire")
      ).toBeVisible()

      // Submit button
      await expect(
        dialog.getByRole("button", { name: "Créer un jeu" })
      ).toBeVisible()
    })

    test("should display slider with percentage label", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un jeu" }).click()
      const dialog = await waitForDialog(page)

      // Slider should be present
      const slider = dialog.getByRole("slider")
      await expect(slider).toBeVisible()

      // Percentage label should be visible (e.g., "50%")
      await expect(dialog.getByText(/%/)).toBeVisible()
    })

    test("should close on cancel", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un jeu" }).click()
      await waitForDialog(page)

      await closeDialogByCancel(page)

      await expect(getDialog(page)).toBeHidden()
    })
  })

  test.describe("QR Codes Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should switch to Codes QR tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Codes QR" }).click()

      await expect(
        page.getByRole("tab", { name: "Codes QR" })
      ).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })
    })

    test('should display "Créer un code QR" button', async ({ page }) => {
      await page.getByRole("tab", { name: "Codes QR" }).click()

      await expect(
        page.getByRole("button", { name: "Créer un code QR" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should show QR codes or empty state", async ({ page }) => {
      await page.getByRole("tab", { name: "Codes QR" }).click()

      const qrCard = page.locator('[data-slot="card"]').first()
      const emptyState = page.getByText("Aucun code QR")

      await expect(qrCard.or(emptyState)).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Create QR Code Dialog", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
      await page.getByRole("tab", { name: "Codes QR" }).click()
    })

    test("should open dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un code QR" }).click()
      const dialog = await waitForDialog(page)

      await expect(
        dialog.getByText("Créer un code QR")
      ).toBeVisible()
    })

    test('should display code field with Generate button', async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Créer un code QR" }).click()
      const dialog = await waitForDialog(page)

      // Code input
      await expect(dialog.getByLabel("Code")).toBeVisible()

      // Generate button
      await expect(
        dialog.getByRole("button", { name: "Générer" })
      ).toBeVisible()
    })

    test("should display table number and location fields", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Créer un code QR" }).click()
      const dialog = await waitForDialog(page)

      await expect(
        dialog.getByLabel("Numéro de table")
      ).toBeVisible()

      await expect(dialog.getByLabel("Emplacement")).toBeVisible()
    })

    test("should close on cancel", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un code QR" }).click()
      await waitForDialog(page)

      await closeDialogByCancel(page)

      await expect(getDialog(page)).toBeHidden()
    })
  })

  test.describe("Prizes Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should switch to Prix tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Prix" }).click()

      await expect(
        page.getByRole("tab", { name: "Prix" })
      ).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })
    })

    test('should display "Créer un prix" button', async ({ page }) => {
      await page.getByRole("tab", { name: "Prix" }).click()

      await expect(
        page.getByRole("button", { name: "Créer un prix" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should show prizes or empty state", async ({ page }) => {
      await page.getByRole("tab", { name: "Prix" }).click()

      const prizeCard = page.locator('[data-slot="card"]').first()
      const emptyState = page.getByText("Aucun prix")

      await expect(prizeCard.or(emptyState)).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Create Prize Dialog", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
      await page.getByRole("tab", { name: "Prix" }).click()
    })

    test("should open dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un prix" }).click()
      const dialog = await waitForDialog(page)

      await expect(dialog.getByText("Créer un prix")).toBeVisible()
    })

    test("should display form fields (name, type, value, validity, quantity, description)", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Créer un prix" }).click()
      const dialog = await waitForDialog(page)

      // Name
      await expect(dialog.getByLabel("Nom du prix")).toBeVisible()

      // Type select
      await expect(dialog.getByText("Type", { exact: false })).toBeVisible()

      // Value
      await expect(dialog.getByLabel("Valeur")).toBeVisible()

      // Validity
      await expect(dialog.getByLabel("Validité (jours)")).toBeVisible()

      // Quantity
      await expect(
        dialog.getByLabel("Quantité disponible")
      ).toBeVisible()

      // Description
      await expect(dialog.getByLabel("Description")).toBeVisible()

      // Submit button
      await expect(
        dialog.getByRole("button", { name: "Créer un prix" })
      ).toBeVisible()
    })

    test("should close on cancel", async ({ page }) => {
      await page.getByRole("button", { name: "Créer un prix" }).click()
      await waitForDialog(page)

      await closeDialogByCancel(page)

      await expect(getDialog(page)).toBeHidden()
    })
  })

  test.describe("History Tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/games", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should switch to Historique tab", async ({ page }) => {
      await page.getByRole("tab", { name: "Historique" }).click()

      await expect(
        page.getByRole("tab", { name: "Historique" })
      ).toHaveAttribute("aria-selected", "true", { timeout: 5_000 })
    })

    test("should show empty state", async ({ page }) => {
      await page.getByRole("tab", { name: "Historique" }).click()

      await expect(
        page.getByText("Aucun historique")
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/dashboard/games", {
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
