import { test, expect } from "@playwright/test"

/**
 * A store id this browser kept, that this deployment never issued.
 *
 * It reached `cms.getPageBlocks` from the first render, and that query's
 * `storeId: v.id("stores")` validator refuses it. Convex raises the refusal out
 * of `useQuery`, during render, and `StorefrontShell` sits in the
 * `(storefront)` layout - so the throw took every storefront page down rather
 * than one component with it.
 *
 * lib/cms/cms-store-id.test.ts holds the decision. This holds what the visitor
 * gets, which is the part that was broken.
 */

/** Written by the storefront selection store (packages/restaurant). */
const SELECTION_KEY = "beyours-storefront-store"

/**
 * A well-formed Convex id that belongs to no table here - the reported case, a
 * browser carrying a selection from a deployment that no longer serves it.
 * Nothing about its shape marks it out; only this deployment's list can tell.
 */
const FOREIGN_STORE_ID = "j91b7c3d5e7f9g1h3j5k7m9n1p3q5r7s"

test.describe("Stale store selection", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ key, storeId }: { key: string; storeId: string }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({ state: { storeId }, version: 0 }),
        )
      },
      { key: SELECTION_KEY, storeId: FOREIGN_STORE_ID },
    )
  })

  test("renders the storefront rather than blanking on it", async ({
    page,
  }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" })

    // Header and footer both live above the page, in the layout that went down.
    await expect(page.getByRole("link", { name: "BeYours" })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/Tous droits réservés/)).toBeVisible({
      timeout: 30_000,
    })

    // Those two are server-rendered, and against a dev server that HTML stays
    // in the DOM behind the error overlay even once the client tree has thrown
    // - so on their own they pass either way. This is the one that bites: the
    // footer heading is `store?.name ?? "BeYours"`, so it stops being the
    // fallback only once the client resolved a store the deployment has.
    // Waiting for a value to appear cannot pass early, the way asserting the
    // absence of the overlay could.
    await expect(page.locator("footer h2").first()).not.toHaveText("BeYours", {
      timeout: 30_000,
    })

    // By now the overlay would have surfaced, so this no longer races it. Dev
    // only: a production server has no such dialog, and there the assertions
    // above carry the check.
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0)
  })

  test("recovers onto a store the deployment does have", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("link", { name: "BeYours" })).toBeVisible({
      timeout: 30_000,
    })

    // `useStoreId` replaces a selection that is not in `stores.list`. It was
    // written to do exactly this and could never run: the CMS query threw
    // first. This assertion bites in both builds.
    await expect
      .poll(
        async () =>
          await page.evaluate((key) => {
            const raw = window.localStorage.getItem(key)
            return raw ? JSON.parse(raw).state?.storeId : null
          }, SELECTION_KEY),
        { timeout: 30_000 },
      )
      .not.toBe(FOREIGN_STORE_ID)
  })
})
