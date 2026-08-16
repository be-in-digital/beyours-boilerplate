/**
 * Fonts for the "Izakaya" template (contemporary Asian) — CLIENT ZONE once
 * applied.
 *
 * Headings: Zen Kaku Gothic New, a gothic drawn in Japan (latin included),
 * the calm precision of contemporary Japanese signage.
 * Body: Noto Sans, plain and covering every alphabet: if the menu mixes latin
 * and ideograms, add the subsets you need here.
 *
 * Engine contract: the CSS variables must stay --font-inter (body) and
 * --font-poppins (headings), they are referenced by app/globals.css.
 */
import { Noto_Sans, Zen_Kaku_Gothic_New } from "next/font/google"

const notoSans = Noto_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-poppins",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${notoSans.variable} ${zenKaku.variable}`
