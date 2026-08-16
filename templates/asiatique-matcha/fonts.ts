/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Zen Old Mincho. Body: Noto Sans.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Noto_Sans, Zen_Old_Mincho } from "next/font/google"

const body = Noto_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Zen_Old_Mincho({
  variable: "--font-poppins",
  weight: ["400","500","700","900"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
