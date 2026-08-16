/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Staatliches. Body: Be Vietnam Pro.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Be_Vietnam_Pro, Staatliches } from "next/font/google"

const body = Be_Vietnam_Pro({
  variable: "--font-inter",
  weight: ["400","500","600","700"],
  subsets: ["latin"],
  display: "swap",
})

const heading = Staatliches({
  variable: "--font-poppins",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
