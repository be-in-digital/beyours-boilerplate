/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Passion One. Texte : Gabarito.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Gabarito, Passion_One } from "next/font/google"

const body = Gabarito({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Passion_One({
  variable: "--font-poppins",
  weight: ["400","700","900"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
