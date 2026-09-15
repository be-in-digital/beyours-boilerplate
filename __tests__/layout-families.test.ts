import { describe, expect, test } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

import {
  ENGINE_LAYOUT,
  HONOURED,
  HONOURED_FAMILIES,
  LAYOUT_FAMILIES,
  isHonoured,
  isLayoutValue,
  layoutAttributes,
  type LayoutFamily,
} from "../lib/layout-families"

/**
 * A template carries its layout, not only its palette (#507).
 *
 * WHAT WAS MISSING. `demos/assets/themes.js` has assigned all seven families —
 * nav, hero, menu, btn, tex, foot, up — to each of the fifty demo identities
 * since the demos were written, and `scripts/gen-templates.mjs` generates the
 * installed catalogue from exactly that file. It read two of them, `hero` and
 * `menu`, to compose an English sentence for `template.json`'s `description`,
 * and threw the machine-readable value away. The other five it never read.
 *
 * So a design sold "by restaurant type" reached a client as a palette, a radius
 * and a font pair, and the layout half of its identity stayed in the sales
 * demo — which is the gap #41 named and #507 scoped.
 *
 * The four rules below are the ones a reader cannot check by looking: that the
 * two copies of a template's layout agree, that the five hand-kept base
 * directories still match the demo identity they are sold as, that a family
 * claimed as honoured really paints something, and — the one that would cost
 * the most — that no rule reading these attributes can reach the dashboard.
 */

const APP_ROOT = path.resolve(__dirname, "..")
const TEMPLATES_DIR = path.join(APP_ROOT, "templates")
const GLOBALS = path.join(APP_ROOT, "app/globals.css")
const ROOT_LAYOUT = path.join(APP_ROOT, "app/layout.tsx")

const require = createRequire(import.meta.url)
const DEMOS = require(path.join(APP_ROOT, "demos/assets/themes.js"))

const FAMILY_NAMES = Object.keys(LAYOUT_FAMILIES) as LayoutFamily[]

/** Every template directory that carries a `template.json`. */
const slugs = fs
  .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((slug) => fs.existsSync(path.join(TEMPLATES_DIR, slug, "template.json")))
  .sort()

function meta(slug: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(TEMPLATES_DIR, slug, "template.json"), "utf8"))
}

/**
 * The layout a template's `layout.ts` declares.
 *
 * Read with a regex rather than imported: these are `.ts` files under
 * `templates/`, outside the app's own module graph, and fifty-one dynamic
 * imports to compare seven strings each is a slower test that proves the same
 * thing.
 */
function declaredLayout(slug: string): Record<string, string> {
  const source = fs.readFileSync(path.join(TEMPLATES_DIR, slug, "layout.ts"), "utf8")
  const body = source.slice(source.indexOf("siteLayout: SiteLayout = {"))
  const found: Record<string, string> = {}
  for (const [, family, value] of body.matchAll(/^\s*([a-z]+):\s*"([^"]*)"/gm)) {
    if (family && value !== undefined) found[family] = value
  }
  return found
}

/** The demo identity a slug is generated from, or sold as. */
const BASE_SOLD_AS: Record<string, string> = {
  pizzeria: "pizzeria-trattoria",
  "fast-food": "fast-food-smash",
  "food-truck": "food-truck-convoi",
  poulet: "poulet-braise",
  asiatique: "asiatique-izakaya",
}

function demoIdentity(slug: string) {
  const id = BASE_SOLD_AS[slug] ?? slug
  return DEMOS.LIST.find((theme: { id: string }) => theme.id === id)
}

describe("the catalogue carries a layout", () => {
  test("there is a catalogue to check", () => {
    // Anti-vacuity: every assertion below iterates this list, and an empty one
    // would make all of them pass on a repository with no templates at all.
    expect(slugs.length).toBeGreaterThanOrEqual(50)
    expect(slugs).toContain("default")
  })

  test("every template declares all seven families, in both files", () => {
    // `layout.ts` is what the site imports; `template.json.layout` is what a
    // catalogue screen reads without parsing TypeScript. Two copies of one fact
    // drift unless something compares them.
    const wrong: string[] = []
    for (const slug of slugs) {
      const declared = declaredLayout(slug)
      const json = (meta(slug).layout ?? {}) as Record<string, string>
      for (const family of FAMILY_NAMES) {
        if (declared[family] === undefined) wrong.push(`${slug}: layout.ts has no ${family}`)
        else if (json[family] !== declared[family]) {
          wrong.push(`${slug}: ${family} is "${declared[family]}" in layout.ts, "${json[family]}" in template.json`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  test("every value is one its family admits", () => {
    // A value outside its family reaches the DOM as an attribute no rule
    // matches — invisible, and an invisible wrong value is how a site silently
    // renders as something else.
    const wrong: string[] = []
    for (const slug of slugs) {
      const declared = declaredLayout(slug)
      for (const family of FAMILY_NAMES) {
        const value = declared[family]
        if (!isLayoutValue(family, value)) wrong.push(`${slug}: ${family}="${value}"`)
      }
    }
    expect(wrong).toEqual([])
  })

  test("the five hand-kept base directories still match the demo they are sold as", () => {
    // `gen-templates.mjs` deliberately leaves these five alone, so nothing
    // regenerates them when the demo identity changes. This is what notices.
    const wrong: string[] = []
    for (const slug of Object.keys(BASE_SOLD_AS)) {
      const identity = demoIdentity(slug)
      expect(identity, `no demo identity for ${slug}`).toBeDefined()
      const declared = declaredLayout(slug)
      for (const family of FAMILY_NAMES) {
        const fromDemo = String(identity[family] ?? "")
        if (declared[family] !== fromDemo) {
          wrong.push(`${slug}: ${family} is "${declared[family]}" here, "${fromDemo}" in themes.js`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  test("a generated template matches its demo identity too", () => {
    // The generator reads `themes.js` directly, so this cannot drift — but it
    // can stop being written at all, and then every value above would be the
    // stale one already on disk.
    const declared = declaredLayout("asiatique-bambou")
    const identity = demoIdentity("asiatique-bambou")

    expect(declared.hero).toBe(String(identity.hero))
    expect(declared.btn).toBe(String(identity.btn))
    expect(declared.up).toBe(String(identity.up ?? 0))
  })
})

/** Every `selector { … }` rule in `globals.css`, comments stripped. */
function globalsRules(): string[] {
  const css = fs.readFileSync(GLOBALS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
  return [...css.matchAll(/([^{}]+)\{/g)]
    .map((match) => (match[1] ?? "").trim())
    .filter((selector) => selector.length > 0)
}

/** The values `globals.css` actually has rules for, per family. */
function valuesInCss(): Record<string, Set<string>> {
  const found: Record<string, Set<string>> = {}
  for (const selector of globalsRules()) {
    for (const [, family, value] of selector.matchAll(/\[data-([a-z]+)="([^"]*)"\]/g)) {
      if (!family || !FAMILY_NAMES.includes(family as LayoutFamily)) continue
      ;(found[family] ??= new Set()).add(value ?? "")
    }
  }
  return found
}

/**
 * A selector list split into the selectors it really is.
 *
 * Not `split(",")`: `:is(h1, h2, h3)` carries commas of its own, and splitting
 * on them turns one scoped selector into three fragments, two of which mention
 * no element at all. The functional groups go first, so what is left is the
 * comma list.
 */
function alternatives(selector: string): string[] {
  return selector
    .replace(/:(?:is|where|not|has)\([^()]*\)/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

describe("what the stylesheet honours", () => {
  test("the scan finds rules — it is not reading an empty stylesheet", () => {
    expect(globalsRules().length).toBeGreaterThan(20)
    expect(Object.keys(valuesInCss()).length).toBeGreaterThan(0)
  })

  test("every value claimed as honoured paints something", () => {
    // A value carried in `template.json` that paints nothing is a promise the
    // product does not keep — the failure this whole issue is about, one level
    // up. Per value and not per family: `hero` honours three of ten, and
    // claiming the family whole would be the same lie at a coarser grain.
    //
    // A family's FIRST value is the engine's own and needs no rule: `split`,
    // `left`, `columns`, `none`, `0` are what the component already renders.
    const painted = valuesInCss()
    const unpainted: string[] = []
    for (const family of FAMILY_NAMES) {
      for (const value of HONOURED[family]) {
        if (value === ENGINE_LAYOUT[family]) continue
        if (!painted[family]?.has(value as string)) unpainted.push(`${family}="${value}"`)
      }
    }

    expect(unpainted, "claimed in HONOURED with no rule in globals.css").toEqual([])
  })

  test("every value that paints something is claimed", () => {
    // The other direction: a rule written without adding its value to HONOURED
    // leaves the catalogue's own documentation saying it does nothing.
    const unclaimed: string[] = []
    for (const [family, values] of Object.entries(valuesInCss())) {
      for (const value of values) {
        if (!isHonoured(family as LayoutFamily, value)) unclaimed.push(`${family}="${value}"`)
      }
    }

    expect(unclaimed, "has rules in globals.css but is not in HONOURED").toEqual([])
  })

  test("a family with no honoured value has no rules at all", () => {
    // `menu` and `btn` are carried, typed and refused-when-invalid, and paint
    // nothing. A stray rule for one would make the README's "not yet" false.
    const painted = valuesInCss()
    const silent = FAMILY_NAMES.filter((family) => HONOURED[family].length === 0)

    expect(silent.length, "no family is unbuilt — this test has nothing to guard").toBeGreaterThan(0)
    expect(silent.filter((family) => painted[family])).toEqual([])
  })

  test("no rule reading a family can reach the dashboard", () => {
    // THE ONE THAT WOULD COST THE MOST. The attribute sits on `<html>`, which
    // is the administration's ancestor too. A selector that reads it without
    // naming `.storefront-theme` repaints the owner's screens — which is
    // exactly what #410 and #41 each cost, one layer down.
    const escaping = globalsRules().filter(
      (selector) =>
        /\[data-(nav|hero|menu|btn|tex|foot|up)\s*=/.test(selector) &&
        !alternatives(selector).every((part) => part.includes(".storefront-theme"))
    )

    expect(escaping, "reads a layout family outside .storefront-theme").toEqual([])
  })
})

describe("what the catalogue tells whoever picks a template", () => {
  const README = path.join(TEMPLATES_DIR, "README.md")

  /** The family rows of README's table, as `{ family: builtClaim }`. */
  function readmeRows(): Record<string, string> {
    const rows: Record<string, string> = {}
    for (const line of fs.readFileSync(README, "utf8").split("\n")) {
      const match = /^\|\s*`([a-z]+)`\s*\|[^|]*\|([^|]*)\|/.exec(line)
      if (match && FAMILY_NAMES.includes(match[1] as LayoutFamily)) {
        rows[match[1] as string] = (match[2] ?? "").trim()
      }
    }
    return rows
  }

  test("every family has a row", () => {
    // Anti-vacuity, and the reason this test exists: the table is what somebody
    // choosing a template reads, and a family missing from it is a value they
    // can set with no way to learn it does nothing.
    expect(Object.keys(readmeRows()).sort()).toEqual([...FAMILY_NAMES].sort())
  })

  test("the prose marks built exactly the families that have a built value", () => {
    // `HONOURED` is the same thing in code and the stylesheet is held against
    // that. Without this, the two could agree while the table a person reads
    // promised one more.
    //
    // `**partly**` is its own mark, for a family where some values are built and
    // some are not — `hero` is three of ten, and calling that `**yes**` would be
    // the coarse-grained version of the lie this issue is about.
    const rows = readmeRows()
    const fully = FAMILY_NAMES.filter(
      (family) => HONOURED[family].length === LAYOUT_FAMILIES[family].length
    ).sort()
    const partly = FAMILY_NAMES.filter(
      (family) =>
        HONOURED[family].length > 0 && HONOURED[family].length < LAYOUT_FAMILIES[family].length
    ).sort()

    const marked = (mark: string) =>
      Object.entries(rows)
        .filter(([, built]) => built.startsWith(mark))
        .map(([family]) => family)
        .sort()

    expect(marked("**yes**")).toEqual(fully)
    expect(marked("**partly**")).toEqual(partly)
    expect(HONOURED_FAMILIES.length).toBe(fully.length + partly.length)
  })
})

describe("what reaches the DOM", () => {
  test("the root layout spreads the families onto <html>", () => {
    const source = fs.readFileSync(ROOT_LAYOUT, "utf8")

    expect(source).toContain('from "@/site/layout"')
    expect(source).toContain("layoutAttributes(siteLayout)")
  })

  test("every family becomes one data attribute", () => {
    const attributes = layoutAttributes({
      nav: "center",
      hero: "poster",
      menu: "bento",
      btn: "brutal",
      tex: "grain",
      foot: "heavy",
      up: "1",
    })

    expect(Object.keys(attributes).sort()).toEqual(
      FAMILY_NAMES.map((family) => `data-${family}`).sort()
    )
    expect(attributes["data-hero"]).toBe("poster")
    expect(attributes["data-up"]).toBe("1")
  })

  test("a value outside its family becomes the engine's, not itself", () => {
    // Falling back rather than passing it through: an attribute no rule matches
    // is invisible, so the site would render the engine layout while claiming
    // another. Same outcome, but the DOM would lie about it.
    const attributes = layoutAttributes({ hero: "trapezoid" } as never)

    expect(attributes["data-hero"]).toBe(ENGINE_LAYOUT.hero)
  })

  test("a missing layout is the engine's layout, whole", () => {
    expect(layoutAttributes(undefined)).toEqual(
      Object.fromEntries(FAMILY_NAMES.map((family) => [`data-${family}`, ENGINE_LAYOUT[family]]))
    )
  })

  test("the engine's own layout is a legal one", () => {
    // It is the fallback for every invalid value, so a typo here would make
    // every fallback illegal and nothing else would notice.
    for (const family of FAMILY_NAMES) {
      expect(isLayoutValue(family, ENGINE_LAYOUT[family]), `${family}`).toBe(true)
    }
  })
})
