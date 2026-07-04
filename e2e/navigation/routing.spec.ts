import { test, expect } from "@playwright/test"

// Override storageState to ensure unauthenticated access
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Route Protection", () => {
  test.describe("Unauthenticated Access", () => {
    test("should redirect /dashboard to /sign-in when not authenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 })
    })

    test("should redirect /products to /sign-in when not authenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard/products", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 })
    })

    test("should redirect /orders to /sign-in when not authenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard/orders", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 })
    })

    test("should redirect /stores to /sign-in when not authenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard/stores", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 })
    })
  })

  test.describe("Public Access", () => {
    test("should allow access to /sign-in without authentication", async ({
      page,
    }) => {
      const response = await page.goto("/sign-in", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      expect(response?.status()).toBeLessThan(500)
      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should allow access to /sign-up without authentication", async ({
      page,
    }) => {
      const response = await page.goto("/sign-up", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      expect(response?.status()).toBeLessThan(500)
      await expect(
        page.getByRole("heading", { name: /Créer un compte|Inscription/ })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should allow access to /menu without authentication", async ({
      page,
    }) => {
      const response = await page.goto("/menu", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      expect(response?.status()).toBeLessThan(500)
      await expect(
        page.getByRole("heading", { name: "Menu" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should allow access to /cart without authentication", async ({
      page,
    }) => {
      const response = await page.goto("/cart", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator("body")).not.toBeEmpty()
    })
  })
})
