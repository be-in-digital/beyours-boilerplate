/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Gabarito. Texte : Onest.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Gabarito, Onest } from "next/font/google"

const body = Onest({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Gabarito({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
