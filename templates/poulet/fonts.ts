/**
 * Fonts for the "Braise" template (fast food chicken) — CLIENT ZONE once
 * applied.
 *
 * Headings: Barlow Condensed, a poster condensed with urban rotisserie
 * energy, heavy weights for prices and menu names.
 * Body: Barlow, the same family at normal width: complete consistency from
 * the till receipt to the hero.
 *
 * Engine contract: the CSS variables must stay --font-inter (body) and
 * --font-poppins (headings), they are referenced by app/globals.css.
 */
import { Barlow, Barlow_Condensed } from "next/font/google"

const barlow = Barlow({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

const barlowCondensed = Barlow_Condensed({
  variable: "--font-poppins",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${barlow.variable} ${barlowCondensed.variable}`
