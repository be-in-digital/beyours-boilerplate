/**
 * Every palette a client is actually sold, measured.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM `contrast.test.ts`. That sweep reads
 * `app/globals.css` and nothing else, so it measures the engine's default
 * palette — the one NO delivered site runs. `app/layout.tsx` imports
 * `./globals.css` and then `@/site/theme.css`, and `pnpm template:apply <slug>`
 * overwrites that second file from `templates/<slug>/theme.css`: 45 to 53 token
 * overrides, chosen at clone time, one of the 51 verticals under `templates/`.
 * Every one of those overrides is invisible to a sweep of `globals.css`.
 *
 * WHAT IT FOUND ON THE DAY IT WAS WRITTEN. 50 of the 51 templates carried at
 * least one pair below the WCAG 2.1 AA floor. The dominant defect was one
 * mistake copied 50 times: every template set `--input` to the same value as
 * `--border`, which is exactly the defect `app/globals.css:126-135` had already
 * found and fixed for the engine, in a comment that says why — "the product
 * was, to a low-vision user, a rectangle that was not there". `--input` is the
 * boundary of every form field (`Input.tsx:12`), so every delivered site had
 * form fields whose edge was not there: 1.09:1 on `food-truck-tacoloco`,
 * 1.21:1 on `asiatique-bambou`, against the 3:1 WCAG 1.4.11 asks of a control.
 * Under it sat a quieter band of marginal misses — `--muted-foreground` at
 * 3.37:1 and a cluster of semantic inks at 4.32–4.49 — all of them on `--muted`.
 *
 * `templates/README.md` claimed "AA contrast verified: every palette passes
 * WCAG AA". Nothing measured it. This is what makes that sentence true, and it
 * is why the sentence now points here.
 *
 * WHAT IT DOES NOT DO. This is the token matrix, not the markup sweep. Running
 * `scanContrast` 51 times would re-parse every `.tsx` in the app once per
 * template, which is minutes of CI for a set of files that do not change
 * between templates — only the token VALUES do. So the markup is swept once,
 * under the default palette, by `contrast.test.ts`; the values every client
 * actually receives are swept here. A pair that fails only for a class
 * combination unique to one template would fall between the two, and that gap
 * is deliberate rather than unnoticed.
 */

import { readdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { AA_LARGE, AA_TEXT, contrast, type Rgb } from "@be-in-digital/ui/contrast"
import { loadTokens } from "@be-in-digital/ui/contrast-scan"

/** The four token scopes a delivered site renders under. */
const SCOPES = [
  { label: "admin, light", mode: "light", scope: "" },
  { label: "admin, dark", mode: "dark", scope: "" },
  { label: "storefront, light", mode: "light", scope: ".storefront-theme" },
  { label: "storefront, dark", mode: "dark", scope: ".storefront-theme" },
] as const

/**
 * The same matrix `contrast.test.ts` holds the engine palette to.
 *
 * Kept as its own copy deliberately: this file has to keep measuring what a
 * client receives even if the engine's own list is narrowed, and a shared
 * constant that one of the two callers quietly shrinks is how a guard stops
 * guarding without anything going red.
 */
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
]
const INK_ON_SURFACE = ["primary-ink", "destructive", "success", "warning", "info", "accent-solid"]
const SURFACES = ["background", "card", "muted"]
/** WCAG 1.4.11: a control that has to be seen needs 3:1, text or not. */
const NON_TEXT = ["primary", "ring", "input", "accent-solid", "destructive"]

const SELECTORS = [":root", ".dark", ".storefront-theme", ".dark .storefront-theme"]

const TEMPLATES = readdirSync("templates")
  .filter((slug) => existsSync(join("templates", slug, "theme.css")))
  .sort()

/**
 * Every AA failure one palette produces, as readable rows.
 *
 * `dir` is relative to `templates/`, so a slug names a catalogue entry and
 * `../site` names the client zone the app actually imports.
 */
function failuresFor(dir: string): string[] {
  const slug = dir === join("..", "site") ? "site/theme.css" : dir
  // The real cascade: globals first, then the overlay, exactly as
  // `app/layout.tsx` imports them.
  const tokens = loadTokens(process.cwd(), SELECTORS, [join("templates", dir, "theme.css")])

  // A scope selector sits on a DESCENDANT element, so what it declares beats
  // what it would inherit — the same chain the engine sweep resolves through.
  const resolve = (mode: string, scope: string, name: string): Rgb | null => {
    const chain = scope
      ? mode === "dark"
        ? [`.dark ${scope}`, scope, ".dark"]
        : [scope, ":root"]
      : [mode === "dark" ? ".dark" : ":root"]
    for (const selector of chain) {
      const value = tokens.get(selector)?.get(name)
      if (value) return value
    }
    return null
  }

  const rows: string[] = []
  for (const { label, mode, scope } of SCOPES) {
    const check = (ink: string, surface: string, floor: number) => {
      const a = resolve(mode, scope, ink)
      const b = resolve(mode, scope, surface)
      // A token neither the template nor globals declares in this scope is not
      // a failure; `contrast.test.ts` is what holds the engine's own set whole.
      if (!a || !b) return
      const ratio = contrast(a, b)
      if (ratio >= floor) return
      rows.push(
        `${slug} — ${label}: ${ratio.toFixed(2)}:1 (needs ${floor})  --${ink} on --${surface}`
      )
    }
    for (const [ink, surface] of LABEL_ON_FILL) check(ink, surface, AA_TEXT)
    for (const ink of INK_ON_SURFACE) for (const surface of SURFACES) check(ink, surface, AA_TEXT)
    for (const token of NON_TEXT) check(token, "background", AA_LARGE)
  }
  return rows
}

describe("every shipped template palette", () => {
  it("clears WCAG 2.1 AA in all four scopes", () => {
    const below = TEMPLATES.flatMap(failuresFor)
    expect(below).toEqual([])
  })

  /**
   * And the file the app actually imports.
   *
   * `templates/<slug>/theme.css` is the SOURCE; `site/theme.css` is the copy
   * `pnpm template:apply` writes and `app/layout.tsx` imports, and it is the
   * CLIENT ZONE — the one stylesheet a client is invited to hand-edit, which a
   * template update deliberately never overwrites. So it can drift from every
   * template in the catalogue and be the only palette anybody renders. In a
   * cloned client repository this assertion is the whole of this file that
   * matters: it measures that client's own colours.
   */
  it("clears it for site/theme.css, which is what layout.tsx imports", () => {
    expect(existsSync("site/theme.css")).toBe(true)
    expect(failuresFor(join("..", "site"))).toEqual([])
  })

  it("is actually looking at all 51 of them", () => {
    // A sweep that has stopped resolving templates reports no failures, which
    // reads as the same green as 51 sound palettes. Both halves are asserted:
    // that the directory is still being enumerated, and that a token actually
    // came back for each one.
    expect(TEMPLATES.length).toBe(51)
    for (const slug of TEMPLATES) {
      const tokens = loadTokens(process.cwd(), SELECTORS, [join("templates", slug, "theme.css")])
      expect(tokens.get(":root")?.size ?? 0).toBeGreaterThan(20)
    }
  })

  it("reads the template's value and not the engine's", () => {
    // The overlay is the whole point of this file: if `loadTokens` ever stops
    // applying it, every assertion above silently re-measures `globals.css` 51
    // times and passes. `asiatique-bambou` sets a green `--primary` where the
    // engine ships orange, so the two cannot be confused.
    const withTemplate = loadTokens(process.cwd(), SELECTORS, [
      join("templates", "asiatique-bambou", "theme.css"),
    ])
    const engineOnly = loadTokens(process.cwd(), SELECTORS)
    expect(withTemplate.get(":root")?.get("primary")).not.toEqual(
      engineOnly.get(":root")?.get("primary")
    )
  })
})
