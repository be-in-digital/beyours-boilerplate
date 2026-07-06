/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Cormorant Garamond. Texte : Outfit.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Cormorant_Garamond, Outfit } from "next/font/google"

const body = Outfit({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Cormorant_Garamond({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
