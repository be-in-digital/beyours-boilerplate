/**
 * Fonts for the "Smash" template (fast food burger) — CLIENT ZONE once
 * applied.
 *
 * Headings: Bricolage Grotesque, a fleshy expressive grotesque — counter
 * energy without falling into fast-food caricature.
 * Body: Archivo, a sturdy utilitarian grotesque, very readable at small sizes
 * (prices, options, tickets).
 *
 * Engine contract: the CSS variables must stay --font-inter (body) and
 * --font-poppins (headings), they are referenced by app/globals.css.
 */
import { Archivo, Bricolage_Grotesque } from "next/font/google"

const archivo = Archivo({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const bricolage = Bricolage_Grotesque({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${archivo.variable} ${bricolage.variable}`
