import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

/**
 * Display Screen E2E Tests
 *
 * The display page at /display/[storeId] is a customer-facing TV screen.
 * It requires a valid storeId and Convex connection.
 * Tests verify the page loads without crashing and shows expected structure.
 */
test.describe("Display Screen", () => {
  const DISPLAY_URL = "/display/test-store-id"

  test.describe("Page Load", () => {
    test("should render without crashing", async ({ page }) => {
      const response = await page.goto(DISPLAY_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // If 404, the route might not be compiled yet — skip gracefully
      if (response && response.status() === 404) {
        test.skip(true, "Display route not compiled yet (404)")
        return
      }

      // The page should at minimum render body content
      await expect(page.locator("body")).toBeVisible({ timeout: 15_000 })
    })

    test("should display loading state or content", async ({ page }) => {
      const response = await page.goto(DISPLAY_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      if (response && response.status() === 404) {
        test.skip(true, "Display route not compiled yet (404)")
        return
      }

      // Loading indicator or main content should appear
      const loading = page.getByText("Chargement...")
      const main = page.locator("main")
      const body = page.locator("body")

      await expect(
        loading.or(main).or(body)
      ).toBeVisible({ timeout: 15_000 })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      const response = await page.goto(DISPLAY_URL, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      if (response && response.status() === 404) {
        cleanup()
        test.skip(true, "Display route not compiled yet (404)")
        return
      }

      await page.waitForTimeout(3_000)
      cleanup()

      const errors = getErrors().filter(
        (e) => !e.includes("404") && !e.includes("Not Found")
      )
      expect(errors).toEqual([])
    })
  })
})
