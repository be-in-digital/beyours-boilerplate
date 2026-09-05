/**
 * What the storefront publishes about itself (#168, TECH-09).
 *
 * `sitemap.ts` emitted `/s/{slug}` and `/s/{slug}/menu` — a routing scheme that
 * was removed — so measured at HEAD it advertised
 * `https://…/s/chez-luigi` and `https://…/s/chez-luigi/menu` and every URL in
 * it answered 404. `robots.ts` meanwhile disallowed only
 * `/preview/ /dashboard/ /api/ /sign-in /sign-up /forgot-password
 * /reset-password`: the basket, the checkout and a signed-in customer's account
 * were open to every crawler.
 *
 * Both now read `lib/crawler-policy`, and the invariant this file holds is
 * that they cannot contradict each other: nothing `robots.txt` disallows may
 * appear in the sitemap, and nothing in the sitemap may be a path the app does
 * not serve.
 */

import { describe, it, expect, vi } from "vitest"
import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"

vi.mock("server-only", () => ({}))

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    async query(name: string) {
      if (name === "stores.list") {
        return [{ _id: "store_1", slug: "chez-luigi", status: "open" }]
      }
      if (name === "products.list") {
        return [
          { _id: "prod_1", isActive: true, updatedAt: 1_700_000_000_000 },
          { _id: "prod_2", isActive: false },
        ]
      }
      if (name === "blog.listPublishedArticles") {
        return [{ slug: "notre-nouvelle-carte", publishedAt: 1_700_000_000_000 }]
      }
      return []
    }
  },
}))

vi.mock("@/convex/_generated/api", () => ({
  api: {
    stores: { list: "stores.list" },
    products: { list: "products.list" },
    blog: { listPublishedArticles: "blog.listPublishedArticles" },
  },
}))

process.env.NEXT_PUBLIC_SITE_URL = "https://chez-luigi.fr"
process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud"

const sitemap = (await import("@/app/sitemap")).default
const robots = (await import("@/app/robots")).default
const { PUBLIC_STOREFRONT_ROUTES, isDisallowedPath } = await import(
  "@/lib/crawler-policy"
)

/** Every path the App Router actually serves under `(storefront)`. */
function routeTree(dir: string, prefix = ""): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      // `_components` is opted out of routing; a group folder adds no segment.
      if (entry.startsWith("_")) continue
      found.push(...routeTree(full, prefix + (entry.startsWith("(") ? "" : `/${entry}`)))
    } else if (entry === "page.tsx") {
      found.push(prefix || "/")
    }
  }
  return found
}

const STOREFRONT_DIR = join(process.cwd(), "app/(storefront)")

function disallowedRules(): string[] {
  const rules = robots().rules
  const list = Array.isArray(rules) ? rules : [rules]
  return list.flatMap((rule) =>
    Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [],
  )
}

describe("sitemap.xml", () => {
  it("emits no `/s/` URL — that routing scheme no longer exists", async () => {
    const entries = await sitemap()

    expect(entries.length).toBeGreaterThan(0)
    expect(entries.some((entry) => entry.url.includes("/s/"))).toBe(false)
  })

  it("emits only paths the app actually serves", async () => {
    const routes = new Set(routeTree(STOREFRONT_DIR))
    const entries = await sitemap()

    for (const entry of entries) {
      const path = new URL(entry.url).pathname
      // A dynamic entry resolves against its own route template.
      const template = path
        .replace(/^\/product\/[^/]+$/, "/product/[productId]")
        .replace(/^\/blog\/[^/]+$/, "/blog/[slug]")
      expect(routes.has(template), `${path} is not a route`).toBe(true)
    }
  })

  it("lists the fixed public pages", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    for (const route of PUBLIC_STOREFRONT_ROUTES) {
      expect(urls).toContain(`https://chez-luigi.fr${route.path}`)
    }
  })

  it("lists the catalogue and the published articles", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).toContain("https://chez-luigi.fr/product/prod_1")
    expect(urls).toContain("https://chez-luigi.fr/blog/notre-nouvelle-carte")
  })

  it("leaves out a deactivated product", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(urls).not.toContain("https://chez-luigi.fr/product/prod_2")
  })

  it("emits each URL once", async () => {
    const urls = (await sitemap()).map((entry) => entry.url)

    expect(new Set(urls).size).toBe(urls.length)
  })
})

describe("robots.txt", () => {
  it("disallows the account, the basket, the checkout and the order pages", () => {
    const blocked = disallowedRules()

    for (const path of ["/account/", "/cart", "/checkout", "/order/", "/track/"]) {
      expect(blocked).toContain(path)
    }
  })

  it("still disallows the staff and machine surfaces", () => {
    const blocked = disallowedRules()

    for (const path of ["/api/", "/dashboard/", "/preview/", "/sign-in", "/sign-up"]) {
      expect(blocked).toContain(path)
    }
  })

  it("no longer allows the removed `/s/` prefix", () => {
    const rules = robots().rules
    const list = Array.isArray(rules) ? rules : [rules]
    const allowed = list.flatMap((rule) =>
      Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : [],
    )

    expect(allowed).not.toContain("/s/")
    expect(allowed).toContain("/")
  })

  it("names the answer engines with the same rules as everybody else", () => {
    const rules = robots().rules
    const list = Array.isArray(rules) ? rules : [rules]
    const agents = list.flatMap((rule) =>
      Array.isArray(rule.userAgent) ? rule.userAgent : rule.userAgent ? [rule.userAgent] : [],
    )

    expect(agents).toContain("*")
    expect(agents).toContain("GPTBot")
    expect(agents).toContain("ClaudeBot")
    expect(agents).toContain("PerplexityBot")
  })

  it("points at a sitemap on the configured origin", () => {
    expect(robots().sitemap).toBe("https://chez-luigi.fr/sitemap.xml")
  })
})

describe("the two halves agree", () => {
  it("no sitemap URL is a path robots.txt disallows", async () => {
    const entries = await sitemap()
    const blocked = disallowedRules()

    for (const entry of entries) {
      const path = new URL(entry.url).pathname
      expect(
        blocked.some((rule) => path.startsWith(rule)),
        `${path} is in the sitemap and disallowed in robots.txt`,
      ).toBe(false)
    }
  })

  it("no page the inventory advertises is one it also blocks", () => {
    for (const route of PUBLIC_STOREFRONT_ROUTES) {
      expect(isDisallowedPath(route.path), `${route.path}`).toBe(false)
    }
  })
})
