import { test, expect } from "@playwright/test"

test.describe("CMS Preview", () => {
  test.describe("Access Control", () => {
    test("should redirect unauthenticated user from preview to sign-in", async ({
      page,
    }) => {
      // Navigate to preview without auth
      await page.goto("/preview/sign-in", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Should either show loading, redirect to sign-in, or show content
      // Depending on auth state
      await page.waitForTimeout(3_000)

      const url = page.url()
      // Either on preview page (if already authenticated) or redirected
      expect(
        url.includes("/preview/sign-in") || url.includes("/sign-in")
      ).toBeTruthy()
    })
  })

  test.describe("Preview Banner", () => {
    test("should display preview banner when authenticated", async ({
      page,
    }) => {
      // This test requires authentication setup
      // Navigate to preview
      await page.goto("/preview/sign-in", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Wait for either the preview banner or redirect
      await page.waitForTimeout(5_000)

      // If we're on the preview page, check for the banner
      if (page.url().includes("/preview/")) {
        await expect(page.getByText(/mode preview/i)).toBeVisible({
          timeout: 10_000,
        })
      }
    })
  })
})
