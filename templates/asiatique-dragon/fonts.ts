/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Playfair Display. Texte : Public Sans.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Playfair_Display, Public_Sans } from "next/font/google"

const body = Public_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Playfair_Display({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
