/*
 * Site layout — CLIENT ZONE.
 *
 * The layout half of "Forno Nero" (Pizzeria), beside the colour half in theme.css
 * and the type half in fonts.ts. Generated from the "pizzeria-fornonero" demo identity
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
  hero: "duo",
  menu: "ledger",
  btn: "square",
  tex: "grain",
  foot: "heavy",
  up: "1"
}
