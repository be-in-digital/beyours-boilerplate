/**
 * Fonts for the "Trattoria" template (pizzeria) — CLIENT ZONE once applied.
 *
 * Headings: Libre Bodoni, an Italian didone (Bodoni heritage, Parma) — the
 * typographic DNA of Italian signs and menus, in a premium cut.
 * Body: Figtree, a warm geometric humanist that stays very readable.
 *
 * Engine contract: the CSS variables must stay --font-inter (body) and
 * --font-poppins (headings), they are referenced by app/globals.css.
 */
import { Figtree, Libre_Bodoni } from "next/font/google"

const figtree = Figtree({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const libreBodoni = Libre_Bodoni({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${figtree.variable} ${libreBodoni.variable}`
