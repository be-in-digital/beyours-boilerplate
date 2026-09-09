/**
 * Every colour a diner or an owner is asked to read, measured.
 *
 * WHAT THIS HOLDS SHUT. #410, raised by the owner from real use — "parfois les
 * couleurs ne sont pas très visibles" — and then measured rather than argued
 * about. Measured at `e8a396e`: 794 foreground/background pairs below the WCAG
 * 2.1 AA floor across the storefront, the sign-in screens, the admin and the
 * two UI packages — 484 of them with a surface this sweep can resolve, and 226
 * of those in LIGHT mode, which is to say live for everyone with no dark phone
 * required. Some were not marginal:
 *
 *   1.07:1  the storefront footer's copyright, `text-accent-foreground/40` on
 *           `bg-primary-hover` — dark green on dark green
 *   1.10:1  every card on the storefront, in dark mode: `.storefront-theme`
 *           had no dark counterpart, so near-black storefront ink landed on
 *           the engine's near-black `--card`
 *   2.85:1  the engine's own `--primary`: a white label on `#f97015`, and any
 *           word written in `text-primary`
 *   4.42:1  `text-muted-foreground` on `bg-muted`, in 952 places
 *
 * WHY A SOURCE SWEEP AND NOT A BROWSER. A browser measures the pages a test
 * mounts. This measures every page, including the ones no test mounts — which
 * is where the failures were. The arithmetic underneath is not trusted on its
 * own: it is checked against Chromium, with every colour read back off a canvas
 * so oklch, `color-mix` and alpha compositing are resolved by the engine rather
 * than re-implemented here. 194 of the first 199 pairs agreed to within 0.06;
 * re-run over the whole resolved set after the fixes, 389 of 398.
 *
 * WHY IT LIVES IN THE APP AND THE ENGINE BOTH. The scanner and the WCAG maths
 * are in `@be-in-digital/ui` — the package that owns the colours, next to
 * `readableForeground` and the branding sweep that guards the DERIVED palette.
 * The regions are here because only the app knows which of its trees render
 * under which token scope, and because a client site cloned from this template
 * runs this same file over its own source.
 *
 * WHEN THIS GOES RED, the fix is a token, not a hex. A literal that fails is a
 * literal that escaped the design system: route it back through the token
 * layer and an establishment's own branding governs it, with
 * `readableForeground` guaranteeing the result. And never reach for `opacity`
 * or a `/60` modifier to soften text — it multiplies the ratio down silently,
 * which is how the footer got to 1.07:1.
 */

import { readFileSync, readdirSync, type Dirent } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { AA_LARGE, AA_TEXT, contrast } from "@be-in-digital/ui/contrast"
import { formatFailures, loadTokens, scanContrast } from "@be-in-digital/ui/contrast-scan"

/**
 * The token scope each tree renders under.
 *
 * `.storefront-theme` is carried by two elements — the `<div>` in
 * `components/storefront/storefront-shell.tsx` and the one in
 * `app/(auth)/layout.tsx` — and a custom property declared on an element beats
 * the one it would inherit, so everything inside either of them reads the
 * storefront palette and everything outside reads the engine's. The `(auth)`
 * pages are inside it deliberately: a diner signing in to order is the same
 * person the storefront serves, and the greens those pages used to spell as
 * literal hex were this scope's own values. The admin, the kitchen display and
 * the engine packages are outside.
 */
const REGIONS = [
  // The trees a scope wraps come first: a file is measured once, under the
  // scope of whichever region claims it. `(auth)` is in this list because its
  // layout carries `.storefront-theme` — a diner signing in to order is the
  // same person the storefront serves, and the greens those pages had been
  // painting themselves with by hand were that scope's values digit for digit.
  { dir: "app/(storefront)", scope: ".storefront-theme" },
  { dir: "components/storefront", scope: ".storefront-theme" },
  { dir: "components/website", scope: ".storefront-theme" },
  { dir: "app/(auth)", scope: ".storefront-theme" },
  // Then everything else this app renders — the admin, the kitchen display,
  // the QR game, the CMS preview, the error boundaries.
  { dir: "app", scope: "" },
  { dir: "components", scope: "" },
  { dir: "lib", scope: "" },
  // And the two engine packages, which render inside the admin.
  { dir: "node_modules/@be-in-digital/ui/src", scope: "" },
  { dir: "node_modules/@be-in-digital/admin/src", scope: "" },
]

/**
 * Parsing and walking every `.tsx` in the app and two engine packages, twice.
 * Stated because `vitest.config.ts` would otherwise give a whole-tree sweep the
 * same budget as a unit test — the mistake this suite's sibling in
 * `packages/ui` was red for.
 */
const SWEEP_BUDGET_MS = 120_000

describe("WCAG 2.1 AA contrast", () => {
  const failures = scanContrast({
    appDir: process.cwd(),
    scopes: [".storefront-theme"],
    regions: REGIONS,
  })

  /**
   * Pairs whose surface is painted by a component in ANOTHER file — the
   * storefront header over the hero image, a game screen inside its shell —
   * are excluded, not waved through: no static reading can say what colour an
   * image is. They are reported by `surfaceKnown: false` and are for a person
   * to check.
   */
  const measured = failures.filter((failure) => failure.surfaceKnown)

  it("has no rendered pair below the floor, in either colour scheme", () => {
    expect(formatFailures(measured)).toBe("No pair below the WCAG 2.1 AA floor.")
  }, SWEEP_BUDGET_MS)

  it("is actually looking at something", () => {
    // A scanner that resolves nothing reports no failures, which is the same
    // green as a product with no failures. The regions above cover several
    // hundred files and thousands of colour utilities; if this number
    // collapses, the sweep has stopped working rather than the product having
    // become perfect.
    const seen = scanContrast({
      appDir: process.cwd(),
      scopes: [".storefront-theme"],
      regions: REGIONS,
      // Nothing clears 21:1 except black on white, so this counts the pairs
      // the scanner actually resolved.
      minimumRatio: 21,
    })
    expect(seen.length).toBeGreaterThan(500)
  }, SWEEP_BUDGET_MS)
})

/**
 * The scopes and schemes a token can be resolved under.
 *
 * `.storefront-theme` is consulted before `.dark` for the same reason the
 * markup sweep does it: the scope sits on a descendant element, so what it
 * declares beats what it would inherit.
 */
const SCOPES = [
  { label: "admin, light", mode: "light", scope: "" },
  { label: "admin, dark", mode: "dark", scope: "" },
  { label: "storefront, light", mode: "light", scope: ".storefront-theme" },
  { label: "storefront, dark", mode: "dark", scope: ".storefront-theme" },
] as const

/** Every label that has to be read on its own fill. */
const LABEL_ON_FILL: Array<[string, string]> = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["primary-foreground", "primary"],
  ["destructive-foreground", "destructive"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["info-foreground", "info"],
  ["accent-solid-foreground", "accent-solid"],
  ["foreground", "card"],
  ["foreground", "muted"],
  // The sidebar carries its own set, spelled as whole `hsl()` values rather
  // than triples, and it is the chrome an owner looks at all day.
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
]

/** Every token a word is written in, and the surfaces it is written on. */
const INK_ON_SURFACE = ["primary-ink", "destructive", "success", "warning", "info", "accent-solid"]
const SURFACES = ["background", "card", "muted"]

describe("the token matrix itself", () => {
  const tokens = loadTokens(process.cwd(), [
    ":root",
    ".dark",
    ".storefront-theme",
    ".dark .storefront-theme",
  ])

  const resolve = (mode: "light" | "dark", scope: string, name: string) => {
    const chain = scope
      ? mode === "dark"
        ? [`.dark ${scope}`, scope, ".dark"]
        : [scope, ":root"]
      : [mode === "dark" ? ".dark" : ":root"]
    for (const selector of chain) {
      const value = tokens.get(selector)?.get(name)
      if (value) return value
    }
    throw new Error(`no --${name} in ${mode}/${scope || ":root"}`)
  }

  it("clears AA before any markup is involved", () => {
    // Ten of these failed when #410 was raised, and none of them needed a
    // literal to do it: `--primary-foreground` on `--primary` was 2.85:1,
    // `--muted-foreground` on `--muted` was 4.42:1, and `--warning` was
    // 1.95:1 on `--muted` — below even the 3:1 an ICON needs.
    const below: string[] = []
    for (const { label, mode, scope } of SCOPES) {
      const check = (ink: string, surface: string) => {
        const ratio = contrast(resolve(mode, scope, ink), resolve(mode, scope, surface))
        if (ratio < AA_TEXT) below.push(`${label}: ${ratio.toFixed(2)}:1  --${ink} on --${surface}`)
      }
      for (const [ink, surface] of LABEL_ON_FILL) check(ink, surface)
      for (const ink of INK_ON_SURFACE) for (const surface of SURFACES) check(ink, surface)
    }
    expect(below).toEqual([])
  })

  it("separates every control from the page it sits on", () => {
    // WCAG 1.4.11: a non-text element that has to be seen needs 3:1. A focus
    // ring, a button fill and the boundary of an input are all of them.
    // `--border` is deliberately not here: it is a decorative separator, which
    // is why `--input` is a separate and lighter value in the dark storefront.
    const below: string[] = []
    for (const { label, mode, scope } of SCOPES) {
      for (const token of ["primary", "ring", "input", "accent-solid", "destructive"]) {
        const ratio = contrast(resolve(mode, scope, token), resolve(mode, scope, "background"))
        if (ratio < AA_LARGE) below.push(`${label}: ${ratio.toFixed(2)}:1  --${token} vs --background`)
      }
    }
    expect(below).toEqual([])
  })

  /**
   * The ring is measured above at FULL opacity. This is what makes that the
   * right thing to measure.
   *
   * `--ring` cleared 1.4.11 in all four scopes and the focus indicator still
   * did not, because every primitive rendered it as `focus-visible:ring-ring/50`
   * — shadcn's stylistic default, carried in unexamined. Half the token is not
   * half as visible: alpha composites toward the page, so 5.03:1 became 2.13:1
   * in the light admin, 7.83:1 became 2.61:1 in the dark one, and 7.63:1 became
   * 2.42:1 on the light storefront. Only the dark storefront cleared, at 3.09:1.
   * A keyboard user could not see where they were, on any screen, in any
   * template — `pizzeria` measured 2.10:1.
   *
   * The fix was to render the token the test already trusted, so this asserts
   * the two have not drifted apart again. Reach for a `/NN` on a focus ring and
   * the arithmetic above stops describing the product.
   *
   * SCOPE, STATED. This holds the DESIGN SYSTEM — the primitives every admin
   * and storefront screen composes from. It does not reach the bespoke
   * `<input className="… focus:ring-primary/20">` written by hand in the
   * storefront checkout, the auth pages and the affiliate portal: 91 of those
   * exist, most pair the faded ring with a border or background change that
   * has to be judged one at a time, and sweeping them blind would be a visual
   * change nobody measured. They are a separate population and a separate job.
   */
  it("renders the focus ring at the opacity measured above", () => {
    const roots = [
      "node_modules/@be-in-digital/ui/src/components",
      "node_modules/@be-in-digital/admin/src",
    ]
    const faded: string[] = []
    const walk = (dir: string): void => {
      let entries: Dirent[]
      try {
        entries = readdirSync(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(path)
        } else if (entry.name.endsWith(".tsx")) {
          readFileSync(path, "utf8")
            .split("\n")
            .forEach((line, index) => {
              // The focus states only. `aria-invalid:ring-destructive/20` is
              // emphasis layered over a full-opacity `border-destructive`, not
              // the thing that says where the keyboard is.
              const match = line.match(/(?:focus-visible|focus)\]?:ring-ring\/(\d+)/)
              if (match) faded.push(`${path}:${index + 1} — ring-ring/${match[1]}`)
            })
        }
      }
    }
    for (const root of roots) walk(root)
    expect(faded).toEqual([])
  })
})
