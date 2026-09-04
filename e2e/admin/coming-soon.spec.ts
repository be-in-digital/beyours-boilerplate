import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

test.describe("Coming Soon Pages", () => {
  // The four gamification screens left this list when the player flow moved to
  // `@be-in-digital/admin/game`: both apps now render the real
  // `Game{Catalog,QrCodes,Actions,Winners}Page`, and `games.spec.ts` asserts
  // them. `/dashboard/games/settings` is absent for a different reason — the
  // route has no page in either app. It was declared in `adminRoutes` and
  // linked from nowhere, so the constant went rather than the 404 being
  // tolerated here.
  const comingSoonPages = [
    "/dashboard/customers",
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
