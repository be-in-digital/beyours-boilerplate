/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Playfair Display. Body: Public Sans.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Playfair_Display, Public_Sans } from "next/font/google"

const body = Public_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Playfair_Display({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
