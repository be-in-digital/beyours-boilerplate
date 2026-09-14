/**
 * The layout families a template picks from (#507).
 *
 * WHERE THIS COMES FROM. `demos/assets/site.css` declares the contract in its
 * own header, and `demos/assets/themes.js` assigns one value per family to each
 * of the fifty demo identities. Those identities are what
 * `scripts/gen-templates.mjs` already generates the catalogue from — it reads
 * `hero` and `menu` to write an English sentence into `template.json`'s
 * `description`, and throws the machine-readable value away. The other five
 * families it never reads at all.
 *
 * So a design sold "by restaurant type" arrived at a client as a palette, a
 * radius and a font pair, and the layout half of its identity stayed in the
 * sales demo. This table is the layout half, in a form the engine can act on.
 *
 * WHY AN ATTRIBUTE AND NOT A COMPONENT VARIANT. The demos answer this: every
 * family there is pure CSS keyed on a `data-*` attribute of `<html>`, over
 * markup that does not change between variants — `[data-nav="center"] .nav-in
 * { … }`. No JavaScript, no per-variant tree. The engine's markup is not the
 * demos' markup, so the rules have to be written against the engine's own
 * classes rather than lifted; the mechanism carries over unchanged.
 *
 * WHERE THE ATTRIBUTE SITS, AND WHERE THE RULES MAY REACH. The attribute goes
 * on `<html>`, as it does in the demos. Every rule that reads it MUST be
 * confined to `.storefront-theme` — the shell's own div — because `<html>` is
 * the administration's ancestor too. That is the same lesson #410 and #41 cost:
 * name the element the storefront actually is, or you repaint the dashboard.
 * `app/globals.css` holds the rules, and a test refuses one that escapes.
 */

/** Every family, with its allowed values. The first value of each is the engine's own. */
export const LAYOUT_FAMILIES = {
  nav: ["left", "center", "bar", "minimal"],
  hero: [
    "split",
    "editorial",
    "fullbleed",
    "poster",
    "board",
    "magazine",
    "zen",
    "banner",
    "collage",
    "duo",
  ],
  menu: ["cards", "dotted", "tickets", "zen", "mosaic", "ledger", "tabs", "bento"],
  btn: ["soft", "pill", "square", "brutal", "underline"],
  tex: ["none", "dots", "lines", "grain", "checker"],
  foot: ["columns", "center", "heavy"],
  up: ["0", "1"],
} as const satisfies Record<string, readonly string[]>

export type LayoutFamily = keyof typeof LAYOUT_FAMILIES

/** The layout half of a template's identity: one value per family. */
export type SiteLayout = {
  [F in LayoutFamily]: (typeof LAYOUT_FAMILIES)[F][number]
}

/**
 * The families the storefront actually renders differently today.
 *
 * Listed rather than inferred, and listed HERE rather than only in the
 * stylesheet, because a family carried in `template.json` that paints nothing
 * is a promise the product does not keep. `layout-families.test.ts` compares
 * this set against the rules in `app/globals.css` in both directions: a family
 * named here with no rule fails, and a rule for a family not named here fails.
 * So implementing one is a two-line edit and its row flips on the same commit.
 *
 * The other five are carried, typed and refused-when-invalid, and change
 * nothing on screen yet. `templates/README.md` says which is which, in the same
 * words, for the person choosing a template rather than reading this file.
 */
export const HONOURED_FAMILIES = ["tex", "up"] as const satisfies readonly LayoutFamily[]

/** The engine's own layout — what a site renders with no template applied. */
export const ENGINE_LAYOUT: SiteLayout = {
  nav: "left",
  hero: "split",
  menu: "cards",
  btn: "soft",
  tex: "none",
  foot: "columns",
  up: "0",
}

/** Is `value` one this family admits? */
export function isLayoutValue(family: LayoutFamily, value: unknown): boolean {
  return (LAYOUT_FAMILIES[family] as readonly string[]).includes(String(value))
}

/**
 * The `data-*` attributes for a layout, ready to spread onto `<html>`.
 *
 * A value outside its family falls back to the engine's rather than reaching
 * the DOM: an attribute no rule matches is invisible, and an invisible wrong
 * value is how a template silently renders as something else. The applier
 * refuses a template with no `layout.ts` at all, which is the loud half of the
 * same rule.
 */
export function layoutAttributes(
  layout: Partial<SiteLayout> | undefined
): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const family of Object.keys(LAYOUT_FAMILIES) as LayoutFamily[]) {
    const chosen = layout?.[family]
    attributes[`data-${family}`] = isLayoutValue(family, chosen)
      ? String(chosen)
      : ENGINE_LAYOUT[family]
  }
  return attributes
}
