/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Anton. Body: Archivo Narrow.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Anton, Archivo_Narrow } from "next/font/google"

const body = Archivo_Narrow({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Anton({
  variable: "--font-poppins",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
