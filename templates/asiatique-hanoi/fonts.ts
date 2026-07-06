/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Marcellus. Texte : Albert Sans.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Albert_Sans, Marcellus } from "next/font/google"

const body = Albert_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Marcellus({
  variable: "--font-poppins",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
