/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Libre Caslon Text. Body: Instrument Sans.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Instrument_Sans, Libre_Caslon_Text } from "next/font/google"

const body = Instrument_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Libre_Caslon_Text({
  variable: "--font-poppins",
  weight: ["400","700"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
