/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Staatliches. Texte : Be Vietnam Pro.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
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
