/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Passion One. Body: Gabarito.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Gabarito, Passion_One } from "next/font/google"

const body = Gabarito({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Passion_One({
  variable: "--font-poppins",
  weight: ["400","700","900"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
