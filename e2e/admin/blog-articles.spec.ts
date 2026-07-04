import { test, expect } from "@playwright/test"
import { waitForAdminPage } from "../helpers/navigation.helpers"
import { waitForDialog, getDialog } from "../helpers/dialog.helpers"

test.describe("Blog Articles", () => {
  test.describe("Page Loading", () => {
    test("should load blog articles page", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await expect(
        page.getByRole("heading", { name: /articles|blog/i })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display create article button", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await expect(
        page.getByRole("button", { name: /nouvel|cr[eé]er|ajouter/i })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display generate article button", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await expect(
        page.getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Create Article Dialog", () => {
    test("should open create article dialog", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /nouvel|cr[eé]er|ajouter/i })
        .click()

      const dialog = await waitForDialog(page)
      await expect(dialog).toBeVisible()
    })

    test("should close create article dialog with Escape", async ({
      page,
    }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /nouvel|cr[eé]er|ajouter/i })
        .click()

      await waitForDialog(page)

      await page.keyboard.press("Escape")

      await expect(getDialog(page)).toBeHidden({ timeout: 5_000 })
    })

    test("should have required fields in create dialog", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /nouvel|cr[eé]er|ajouter/i })
        .click()

      const dialog = await waitForDialog(page)

      // Should have a title input
      await expect(
        dialog.getByLabel(/titre/i).or(dialog.getByPlaceholder(/titre/i))
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test.describe("Generate Article Dialog", () => {
    test("should open generate article dialog", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
        .click()

      const dialog = await waitForDialog(page)
      await expect(dialog).toBeVisible()
    })

    test("should have topic input in generate dialog", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
        .click()

      const dialog = await waitForDialog(page)

      // Should have a topic/subject input
      await expect(
        dialog
          .getByLabel(/sujet|th[eè]me|topic/i)
          .or(dialog.getByPlaceholder(/sujet|th[eè]me/i))
      ).toBeVisible({ timeout: 5_000 })
    })

    test("should have tone selector in generate dialog", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
        .click()

      const dialog = await waitForDialog(page)

      // Should have a tone selector (radio group or select)
      await expect(
        dialog.getByText(/ton|style/i).first()
      ).toBeVisible({ timeout: 5_000 })
    })

    test("should have category selector in generate dialog", async ({
      page,
    }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
        .click()

      const dialog = await waitForDialog(page)

      // Should have a category selector
      await expect(
        dialog.getByText(/cat[eé]gorie/i).first()
      ).toBeVisible({ timeout: 5_000 })
    })

    test("should close generate dialog with Escape", async ({ page }) => {
      await page.goto("/dashboard/content/blog", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await waitForAdminPage(page)

      await page
        .getByRole("button", { name: /g[eé]n[eé]rer|auto|ia/i })
        .click()

      await waitForDialog(page)

      await page.keyboard.press("Escape")

      await expect(getDialog(page)).toBeHidden({ timeout: 5_000 })
    })
  })
})
