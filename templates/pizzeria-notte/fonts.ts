/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Bricolage Grotesque. Texte : Archivo.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
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
