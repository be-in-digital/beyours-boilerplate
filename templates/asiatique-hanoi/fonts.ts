/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Marcellus. Body: Albert Sans.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Albert_Sans, Marcellus } from "next/font/google"

const body = Albert_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Marcellus({
  variable: "--font-poppins",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
