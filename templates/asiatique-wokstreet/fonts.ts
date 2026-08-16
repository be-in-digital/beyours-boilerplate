/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Bricolage Grotesque. Body: Archivo.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { Archivo, Bricolage_Grotesque } from "next/font/google"

const body = Archivo({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Bricolage_Grotesque({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
