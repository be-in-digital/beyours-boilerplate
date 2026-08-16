/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Shippori Mincho. Body: IBM Plex Sans.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { IBM_Plex_Sans, Shippori_Mincho } from "next/font/google"

const body = IBM_Plex_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Shippori_Mincho({
  variable: "--font-poppins",
  weight: ["400","500","600","700"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
