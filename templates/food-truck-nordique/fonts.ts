/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Familjen Grotesk. Body: Karla.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Familjen_Grotesk, Karla } from "next/font/google"

const body = Karla({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Familjen_Grotesk({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
