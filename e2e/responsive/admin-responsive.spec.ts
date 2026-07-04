import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { waitForAdminPage } from "../helpers/navigation.helpers"

test.describe("Admin Responsive", () => {
  test.describe("Mobile (375x667)", () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test("should render dashboard without overflow", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Check that the body does not have horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })

    test("should render products page without overflow", async ({ page }) => {
      await page.goto("/dashboard/products", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })

    test("should render orders page without overflow", async ({ page }) => {
      await page.goto("/dashboard/orders", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })

    test("should show sidebar trigger button on mobile", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Mobile should have a sidebar trigger button (hamburger menu)
      const trigger = page.locator('[data-slot="sidebar-trigger"]')
      await expect(trigger).toBeVisible({ timeout: 10_000 })
    })

    test("should hide sidebar by default on mobile", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Sidebar should not be visible on mobile by default
      const sidebar = page.locator('[data-slot="sidebar"]')
      await expect(sidebar).toBeHidden()
    })
  })

  test.describe("Tablet (768x1024)", () => {
    test.use({ viewport: { width: 768, height: 1024 } })

    test("should render dashboard properly", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      await expect(page.locator("main")).toBeVisible()

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })

    test("should render products page properly", async ({ page }) => {
      await page.goto("/dashboard/products", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      await expect(page.locator("main")).toBeVisible()

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })

    test("should render settings page properly", async ({ page }) => {
      await page.goto("/dashboard/settings", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      await expect(page.locator("main")).toBeVisible()

      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasOverflow).toBe(false)
    })
  })

  test.describe("Desktop (1920x1080)", () => {
    test.use({ viewport: { width: 1920, height: 1080 } })

    test("should show sidebar expanded", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const sidebar = page.locator('[data-slot="sidebar"]')
      await expect(sidebar).toBeVisible()
    })

    test("should render all pages at full width", async ({ page }) => {
      const pages = ["/dashboard", "/dashboard/products", "/dashboard/orders", "/dashboard/stores"]

      for (const url of pages) {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        })
        await waitForAdminPage(page)

        await expect(page.locator("main")).toBeVisible()

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth
        })
        expect(hasOverflow).toBe(false)
      }
    })

    test("should display stat cards in grid layout", async ({ page }) => {
      await page.goto("/dashboard", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      const statCards = page.locator('[data-slot="card"]')
      await expect(statCards.first()).toBeVisible({ timeout: 15_000 })

      // On desktop, stat cards should be laid out in a grid (multiple columns)
      // Check that at least 2 cards are side by side (similar y position)
      const count = await statCards.count()
      if (count >= 2) {
        const box1 = await statCards.nth(0).boundingBox()
        const box2 = await statCards.nth(1).boundingBox()

        if (box1 && box2) {
          // Cards should be on the same row (similar top position)
          const yDiff = Math.abs(box1.y - box2.y)
          expect(yDiff).toBeLessThan(50)
        }
      }
    })
  })

  test.describe("Dialogs on Mobile", () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test("should display create store dialog properly at 375px", async ({
      page,
    }) => {
      await page.goto("/dashboard/stores", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Click the create store button
      const createButton = page.getByRole("button", {
        name: /Ajouter|Créer|Nouveau/i,
      })

      if (await createButton.isVisible().catch(() => false)) {
        await createButton.click()

        const dialog = page.locator('[data-slot="dialog-content"]')
        await expect(dialog).toBeVisible({ timeout: 10_000 })

        // Dialog should not overflow the viewport
        const dialogBox = await dialog.boundingBox()
        if (dialogBox) {
          expect(dialogBox.width).toBeLessThanOrEqual(375)
        }

        await page.keyboard.press("Escape")
      }
    })

    test("should display invite member dialog properly at 375px", async ({
      page,
    }) => {
      await page.goto("/dashboard/team", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Click the invite button
      const inviteButton = page.getByRole("button", {
        name: /Inviter|Ajouter/i,
      })

      if (await inviteButton.isVisible().catch(() => false)) {
        await inviteButton.click()

        const dialog = page.locator('[data-slot="dialog-content"]')
        await expect(dialog).toBeVisible({ timeout: 10_000 })

        // Dialog should not overflow the viewport
        const dialogBox = await dialog.boundingBox()
        if (dialogBox) {
          expect(dialogBox.width).toBeLessThanOrEqual(375)
        }

        await page.keyboard.press("Escape")
      }
    })
  })
})
