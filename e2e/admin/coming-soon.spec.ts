import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

test.describe("Coming Soon Pages", () => {
  // DELIBERATE DIVERGENCE from apps/reference — do not align.
  // /dashboard/games/settings is in this list here and absent there: the bench
  // deleted the route because nothing linked to it, while this template keeps
  // it as one more gamification screen behind ComingSoon. See
  // app/(admin)/dashboard/games/settings/page.tsx.
  const comingSoonPages = [
    "/dashboard/customers",
    "/dashboard/games/catalog",
    "/dashboard/games/qr-codes",
    "/dashboard/games/actions",
    "/dashboard/games/winners",
    "/dashboard/games/settings",
    "/dashboard/email",
    "/dashboard/email/campaigns",
    "/dashboard/content/pages",
    "/dashboard/content/blog",
  ]

  for (const pagePath of comingSoonPages) {
    test(`should render ${pagePath} without crashing`, async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      const response = await page.goto(pagePath, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })

      // Page should not return a 500 server error
      expect(response?.status()).toBeLessThan(500)

      // Page body should not be empty
      await expect(page.locator("body")).not.toBeEmpty()

      // Wait for any async rendering
      await page.waitForTimeout(2_000)

      cleanup()

      const errors = getErrors()
      expect(errors).toEqual([])
    })
  }
})
