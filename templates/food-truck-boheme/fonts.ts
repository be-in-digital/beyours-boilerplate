/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Cormorant Garamond. Body: Outfit.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Cormorant_Garamond, Outfit } from "next/font/google"

const body = Outfit({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Cormorant_Garamond({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
