// @vitest-environment jsdom

/**
 * Renders the real storefront chrome to static HTML, for visual review (#507).
 *
 * WHY A TEST WRITES FILES. A layout family is CSS, and the one question that
 * decides whether its rule is right — does this lay out the way it is meant to —
 * cannot be answered here: **jsdom parses CSS and does not lay it out**, so
 * `getComputedStyle` hands back the declared value and no geometry. That is why
 * `nav`, `hero` and `menu` were held back while `tex`, `up` and `foot` shipped:
 * the first three move boxes, the last three do not.
 *
 * A real browser is the only instrument, and a real browser needs real markup.
 * Copying the components' markup into a fixture would test the copy, so this
 * renders the COMPONENTS and serialises what they produced. The assertions are
 * the ones that would make the artefact worthless if they failed — the hooks the
 * CSS selects on have to be present, and the tree has to be more than a stub.
 *
 * `scripts/layout-harness.mjs` turns these fragments into one page per family
 * value, with `app/globals.css` compiled as Next compiles it.
 * `.layout-harness/` is gitignored: it is an instrument, not an output.
 */

import fs from "node:fs"
import path from "node:path"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const OUT = path.resolve(__dirname, "../.layout-harness/fragments")

/** Which route the header thinks it is on. `/` is the transparent-header case. */
let pathname = "/"

const STORE = {
  _id: "stores_harness",
  name: "Le Comptoir",
  address: { street: "12 rue de la Paix", postalCode: "75002", city: "Paris" },
  phone: "01 23 45 67 89",
  email: "bonjour@lecomptoir.fr",
}

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock("convex/react", () => ({
  useQuery: () => [STORE],
  useMutation: () => async () => null,
  useAction: () => async () => null,
}))

// `api.stores.list` and friends are only ever compared by identity by the mocked
// `useQuery`, so any stable object will do — but it has to exist at every depth.
const apiProxy: unknown = new Proxy(
  {},
  { get: (_t, key) => (key === "then" ? undefined : apiProxy) }
)
vi.mock("@/convex/_generated/api", () => ({ api: apiProxy }))

vi.mock("@/lib/cms/useCmsPage", () => ({
  useCmsPage: () => ({ block: () => ({ field: () => ({}) }) }),
}))

vi.mock("@/lib/hooks", () => ({
  useStoreId: () => ({ storeId: STORE._id, store: STORE, isLoading: false }),
}))

vi.mock("@/lib/hooks/use-store-id", () => ({
  useStoreId: () => ({ storeId: STORE._id, store: STORE, isLoading: false }),
}))

vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }))

vi.mock("@be-in-digital/restaurant", () => ({
  useCartStore: (selector: (s: unknown) => unknown) =>
    selector({ getItemCount: () => 2, items: [] }),
  useStorefrontStoreSelection: (selector: (s: unknown) => unknown) =>
    selector({ storeId: STORE._id, setStoreId: () => {} }),
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "nav.home": "Accueil",
        "nav.menu": "Carte",
        "nav.about": "Le lieu",
        "nav.blog": "Journal",
        "nav.contact": "Contact",
      })[key] ?? key,
  }),
}))

// The chrome's own children are not what any layout family selects on, and each
// drags in a tree of its own. Stubbed to one element so the bar keeps its real
// child count and the artefact stays about the arrangement.
vi.mock("@/components/storefront/cart-sheet", () => ({
  CartSheet: () => <button type="button" aria-label="Panier">Panier</button>,
}))
vi.mock("@/components/storefront/store-selector-dropdown", () => ({
  StoreSelectorDropdown: () => <button type="button">Paris 2e</button>,
}))
vi.mock("@/components/storefront/language-selector-dropdown", () => ({
  LanguageSelectorDropdown: () => <button type="button">FR</button>,
}))
vi.mock("@/components/storefront/user-menu", () => ({
  UserMenu: () => <button type="button">Compte</button>,
}))

const { StorefrontHeader } = await import("@/components/storefront/storefront-header")
const { StorefrontFooter } = await import("@/components/storefront/storefront-footer")

beforeAll(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  fs.mkdirSync(OUT, { recursive: true })
})

const mounted: Array<{ root: Root; container: HTMLElement }> = []

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => root.unmount())
    container.remove()
  }
})

async function renderToHtml(node: React.ReactElement): Promise<string> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ root, container })
  await act(async () => {
    root.render(node)
  })
  return container.innerHTML
}

function emit(name: string, html: string): void {
  fs.writeFileSync(path.join(OUT, `${name}.html`), html)
}

describe("the storefront chrome, serialised for a browser", () => {
  test("the header over a hero — the transparent state", async () => {
    pathname = "/"
    const html = await renderToHtml(<StorefrontHeader hasBanner={false} />)

    // The two things that make the artefact worth looking at: it is the real
    // bar, and it is the transparent variant rather than the opaque one.
    expect(html).toContain("<header")
    expect(html).toContain("bg-transparent")
    expect(html).toContain("Accueil")

    emit("header-transparent", html)
  })

  test("the header on an inner page — the opaque state", async () => {
    pathname = "/menu"
    const html = await renderToHtml(<StorefrontHeader hasBanner={false} />)

    expect(html).toContain("bg-card/90")
    expect(html).not.toContain("bg-transparent")

    emit("header-opaque", html)
  })

  test("the footer, with its layout hooks intact", async () => {
    const html = await renderToHtml(<StorefrontFooter />)

    // The hooks `foot` selects on. A renamed class would leave the rules
    // matching nothing and the artefact looking identical under all three
    // values, which is the one failure a screenshot cannot distinguish from
    // "the rule is wrong".
    for (const hook of [
      "storefront-footer",
      "storefront-footer-cols",
      "storefront-footer-brand",
      "storefront-footer-note",
    ]) {
      expect(html, hook).toContain(hook)
    }

    emit("footer", html)
  })
})
