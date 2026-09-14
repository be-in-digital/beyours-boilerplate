/*
 * Site layout — CLIENT ZONE.
 *
 * The layout half of "Pit Stop" (Food truck), beside the colour half in theme.css
 * and the type half in fonts.ts. Generated from the "food-truck-pitstop" demo identity
 * (scripts/gen-templates.mjs); `pnpm template:apply` OVERWRITES it.
 *
 * The seven families and what each admits are declared once, in
 * lib/layout-families.ts. Two of them — tex and up — currently change what a
 * diner sees; the other five are carried and typed and paint nothing yet. See
 * templates/README.md.
 */

import type { SiteLayout } from "@/lib/layout-families"

export const siteLayout: SiteLayout = {
  nav: "bar",
  hero: "poster",
  menu: "bento",
  btn: "square",
  tex: "checker",
  foot: "heavy",
  up: "1"
}
