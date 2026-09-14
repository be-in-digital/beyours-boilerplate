/*
 * Site layout — CLIENT ZONE.
 *
 * The layout half of "Braise" (Chicken), beside the colour half in theme.css and
 * the type half in fonts.ts. Taken from the "poulet-braise" demo identity, the one
 * this historical slug is sold as — `scripts/gen-templates.mjs` deliberately
 * leaves the five base directories alone, so this file is hand-kept in step
 * with `demos/assets/themes.js` and a test compares the two.
 *
 * The seven families and what each admits are declared once, in
 * lib/layout-families.ts. Two of them — tex and up — currently change what a
 * diner sees; the other five are carried and typed and paint nothing yet. See
 * templates/README.md.
 */

import type { SiteLayout } from "@/lib/layout-families"

export const siteLayout: SiteLayout = {
  nav: "left",
  hero: "poster",
  menu: "cards",
  btn: "soft",
  tex: "none",
  foot: "columns",
  up: "1"
}
