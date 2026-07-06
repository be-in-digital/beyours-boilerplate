/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Saira Condensed. Texte : Onest.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Onest, Saira_Condensed } from "next/font/google"

const body = Onest({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Saira_Condensed({
  variable: "--font-poppins",
  weight: ["500","600","700","800"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
