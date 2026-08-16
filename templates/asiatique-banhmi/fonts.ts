/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Gabarito. Body: Onest.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Gabarito, Onest } from "next/font/google"

const body = Onest({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Gabarito({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
