/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Anton. Texte : Archivo Narrow.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
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
