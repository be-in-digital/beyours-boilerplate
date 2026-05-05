import { test, expect } from "@playwright/test"

/**
 * E2E tests for the customer-facing storefront.
 *
 * Tests are data-agnostic: they assert structure (presence of headings,
 * navigation, product cards) rather than specific seeded names. They
 * pass on any non-empty Convex deployment with at least 1 store and 1
 * category.
 *
 * Pre-requisites: a Convex deployment with seeded data.
 * `pnpx convex run seed:runSeed` provides a working dataset.
 */

test.describe("Landing page", () => {
  test("displays hero with menu CTA", async ({ page }) => {
    await page.goto("/")

    await expect(
      page.getByRole("heading", { name: /restaurant/i, level: 1 }),
    ).toBeVisible()

    await expect(page.getByRole("link", { name: /voir le menu/i })).toBeVisible()
    await expect(
      page.getByRole("link", { name: /trouver un restaurant/i }),
    ).toBeVisible()
  })

  test("category preview renders at least one category card", async ({
    page,
  }) => {
    await page.goto("/")

    // Wait for either the heading "Nos categories" or the empty state.
    await expect(
      page.getByRole("heading", { name: /nos categories/i }),
    ).toBeVisible({ timeout: 15_000 })

    const categoryLinks = page.locator('a[href^="/menu?category="]')
    await expect(categoryLinks.first()).toBeVisible()
    expect(await categoryLinks.count()).toBeGreaterThanOrEqual(1)
  })
})

test.describe("Stores selector", () => {
  test("lists at least one store with status pill", async ({ page }) => {
    await page.goto("/stores")

    await expect(
      page.getByRole("heading", { name: /nos restaurants/i, level: 1 }),
    ).toBeVisible()

    // At least one store card linking to /menu?store=
    const storeLinks = page.locator('a[href^="/menu?store="]')
    await expect(storeLinks.first()).toBeVisible({ timeout: 15_000 })
  })
})

test.describe("Menu", () => {
  test("displays category nav and at least one product card", async ({
    page,
  }) => {
    await page.goto("/menu")

    await expect(page.getByRole("link", { name: /^Tout$/ })).toBeVisible()
    await expect(page.getByRole("article").first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test("filters products by category via query param", async ({ page }) => {
    // First go to /menu to discover an existing category slug
    await page.goto("/menu")
    const firstCategoryLink = page
      .locator('nav a[href^="/menu?category="]')
      .first()
    await expect(firstCategoryLink).toBeVisible({ timeout: 15_000 })

    const href = await firstCategoryLink.getAttribute("href")
    expect(href).toBeTruthy()

    await page.goto(href!)
    // Page should render with the article grid (no errors)
    await expect(page.getByRole("article").first()).toBeVisible({
      timeout: 15_000,
    })
  })
})

test.describe("Cart flow", () => {
  test("adding a product updates the cart badge and reaches /cart", async ({
    page,
  }) => {
    await page.goto("/menu")

    const firstProduct = page.getByRole("article").first()
    await expect(firstProduct).toBeVisible({ timeout: 15_000 })

    await firstProduct.getByRole("button", { name: /ajouter/i }).click()
    await expect(
      firstProduct.getByRole("button", { name: /ajoute/i }),
    ).toBeVisible()

    // Cart badge in header shows 1 article
    await expect(
      page.getByRole("link", { name: /panier.*1 article/i }),
    ).toBeVisible()

    await page.getByRole("link", { name: /panier.*1 article/i }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(
      page.getByRole("heading", { name: /mon panier/i }),
    ).toBeVisible()
  })

  test("empty cart shows the empty state", async ({ page, context }) => {
    // Clear localStorage to ensure cart is empty
    await context.clearCookies()
    await page.goto("/cart")
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(
      page.getByRole("heading", { name: /panier est vide/i }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /voir le menu/i }),
    ).toBeVisible()
  })
})

test.describe("Account", () => {
  test("unauthenticated /account shows the sign-in form", async ({ page }) => {
    await page.goto("/account")

    await expect(
      page.getByRole("heading", { name: /^connexion$/i, level: 1 }),
    ).toBeVisible()

    // Switch to sign-up mode
    await page
      .getByRole("paragraph")
      .getByRole("button", { name: /inscrivez-vous/i })
      .click()

    await expect(
      page.getByRole("heading", { name: /creer un compte/i, level: 1 }),
    ).toBeVisible()
  })

  test("/account/orders requires sign-in", async ({ page }) => {
    await page.goto("/account/orders")

    await expect(
      page.getByRole("heading", { name: /connectez-vous/i }),
    ).toBeVisible()
  })

  test("/account/loyalty placeholder is reachable", async ({ page }) => {
    await page.goto("/account/loyalty")

    await expect(
      page.getByRole("heading", { name: /programme de fidelite/i }),
    ).toBeVisible()
  })
})
