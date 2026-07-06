/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Space Grotesk. Texte : Karla.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Karla, Space_Grotesk } from "next/font/google"

const body = Karla({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Space_Grotesk({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
