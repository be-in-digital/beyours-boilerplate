/*
 * Site layout — CLIENT ZONE.
 *
 * The layout half of "Dimanche" (Chicken), beside the colour half in theme.css
 * and the type half in fonts.ts. Generated from the "poulet-dimanche" demo identity
 * (scripts/gen-templates.mjs); `pnpm template:apply` OVERWRITES it.
 *
 * The seven families and what each admits are declared once, in
 * lib/layout-families.ts. Two of them — tex and up — currently change what a
 * diner sees; the other five are carried and typed and paint nothing yet. See
 * templates/README.md.
 */

import type { SiteLayout } from "@/lib/layout-families"

export const siteLayout: SiteLayout = {
  nav: "minimal",
  hero: "zen",
  menu: "zen",
  btn: "pill",
  tex: "none",
  foot: "center",
  up: "0"
}
