/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: League Spartan. Body: Inter Tight.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Inter_Tight, League_Spartan } from "next/font/google"

const body = Inter_Tight({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = League_Spartan({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
