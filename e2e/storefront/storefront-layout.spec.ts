import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

test.describe("Storefront Layout", () => {
  test.describe("Header", () => {
    test("should display the brand link", async ({ page }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      const brandLink = page.getByRole("link", { name: "BeInDigital" })
      await expect(brandLink).toBeVisible({ timeout: 30_000 })
    })

    test("should display the sign-in link when unauthenticated", async ({
      page,
    }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      const signInLink = page.getByRole("link", { name: "Se connecter" })
      await expect(signInLink).toBeVisible({ timeout: 30_000 })
    })
  })

  test.describe("Footer", () => {
    test("should display the powered by text", async ({ page }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByText("Powered by BeInDigital Engine")
      ).toBeVisible({ timeout: 30_000 })
    })
  })

  test.describe("Navigation", () => {
    test("should navigate to home when clicking the brand link", async ({
      page,
    }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      const brandLink = page.getByRole("link", { name: "BeInDigital" })
      await expect(brandLink).toBeVisible({ timeout: 30_000 })

      await brandLink.click()

      await expect(page).toHaveURL("/")
    })

    test("should navigate to /sign-in when clicking the sign-in link", async ({
      page,
    }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      const signInLink = page.getByRole("link", { name: "Se connecter" })
      await expect(signInLink).toBeVisible({ timeout: 30_000 })

      await signInLink.click()

      await expect(page).toHaveURL(/\/sign-in/)
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/menu", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
