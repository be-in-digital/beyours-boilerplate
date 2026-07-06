/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : League Spartan. Texte : Inter Tight.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Inter_Tight, League_Spartan } from "next/font/google"

const body = Inter_Tight({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = League_Spartan({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
