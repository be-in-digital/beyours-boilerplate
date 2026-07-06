/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Alfa Slab One. Texte : Epilogue.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { Alfa_Slab_One, Epilogue } from "next/font/google"

const body = Epilogue({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Alfa_Slab_One({
  variable: "--font-poppins",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
