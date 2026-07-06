/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : Shippori Mincho. Texte : IBM Plex Sans.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { IBM_Plex_Sans, Shippori_Mincho } from "next/font/google"

const body = IBM_Plex_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const heading = Shippori_Mincho({
  variable: "--font-poppins",
  weight: ["400","500","600","700"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${body.variable} ${heading.variable}`
