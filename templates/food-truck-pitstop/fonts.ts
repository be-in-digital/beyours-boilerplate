/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Saira Condensed. Body: Onest.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Onest, Saira_Condensed } from "next/font/google"

const body = Onest({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Saira_Condensed({
  variable: "--font-poppins",
  weight: ["500","600","700","800"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
