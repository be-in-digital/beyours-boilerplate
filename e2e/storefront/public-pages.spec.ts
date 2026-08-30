import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

test.describe("Public Pages", () => {
  test.describe("Home Page", () => {
    test("should load the home page", async ({ page }) => {
      const response = await page.goto("/", { waitUntil: "domcontentloaded" })

      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator("body")).not.toBeEmpty()
    })

    test("should not produce console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })

  test.describe("Menu Page", () => {
    test("should display the heading", async ({ page }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Menu" })
      ).toBeVisible({ timeout: 30_000 })
    })

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/menu", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Menu" })
      ).toBeVisible({ timeout: 30_000 })

      const paragraph = page.locator("p").first()
      await expect(paragraph).toBeVisible()
    })

    test("should not produce console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/menu", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })

  test.describe("Cart Page", () => {
    test("should display the heading", async ({ page }) => {
      await page.goto("/cart", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Votre Box", level: 1 })
      ).toBeVisible({ timeout: 30_000 })
    })

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/cart", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Votre Box", level: 1 })
      ).toBeVisible({ timeout: 30_000 })

      const paragraph = page.locator("p").first()
      await expect(paragraph).toBeVisible()
    })

    test("should not produce console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/cart", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })

  // An anonymous visitor arrives at /checkout with an empty cart, and the page
  // answers with its empty-Box state rather than the order form. That is the
  // page working; exercising "Finaliser Commande" means adding a product first,
  // which is a flow test, not a does-this-route-render test.
  test.describe("Checkout Page", () => {
    test("should display the heading", async ({ page }) => {
      await page.goto("/checkout", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Votre Box", level: 1 })
      ).toBeVisible({ timeout: 30_000 })
    })

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/checkout", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Votre Box", level: 1 })
      ).toBeVisible({ timeout: 30_000 })

      const paragraph = page.locator("p").first()
      await expect(paragraph).toBeVisible()
    })

    test("should not produce console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/checkout", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })

  test.describe("Store Selector Page", () => {
    test("should display the heading", async ({ page }) => {
      await page.goto("/store-selector", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Choisir un restaurant" })
      ).toBeVisible({ timeout: 30_000 })
    })

    test("should display description paragraph", async ({ page }) => {
      await page.goto("/store-selector", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Choisir un restaurant" })
      ).toBeVisible({ timeout: 30_000 })

      const paragraph = page.locator("p").first()
      await expect(paragraph).toBeVisible()
    })

    test("should not produce console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/store-selector", { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
