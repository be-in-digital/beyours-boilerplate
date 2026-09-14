/**
 * Site layout — CLIENT ZONE.
 *
 * The layout half of a template's identity, beside the colour half in
 * `theme.css` and the type half in `fonts.ts`. `pnpm template:apply <slug>`
 * OVERWRITES this file, exactly as it overwrites those two.
 *
 * This is the neutral one: every family is the engine's own value, so a site
 * with no template applied renders what the engine has always rendered.
 *
 * The seven families and what each admits are declared once, in
 * `lib/layout-families.ts`. A value outside its family falls back to the
 * engine's rather than reaching the DOM — an attribute no rule matches is
 * invisible, and an invisible wrong value is how a site silently renders as
 * something else.
 *
 * Two of the seven currently change what a diner sees — `tex` and `up`. The
 * other five are carried and typed and paint nothing yet; `templates/README.md`
 * says so in the same words, and `HONOURED_FAMILIES` is the list a test holds
 * against the stylesheet.
 */

import type { SiteLayout } from "@/lib/layout-families"

export const siteLayout: SiteLayout = {
  nav: "left",
  hero: "split",
  menu: "cards",
  btn: "soft",
  tex: "none",
  foot: "columns",
  up: "0",
}
