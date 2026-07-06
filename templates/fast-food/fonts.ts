/**
 * Polices du template « Smash » (fast food burger) — ZONE CLIENT après
 * application.
 *
 * Titres : Bricolage Grotesque, grotesque charnue et expressive, l'énergie
 * du comptoir sans tomber dans la caricature fast-food.
 * Texte : Archivo, grotesque utilitaire robuste, très lisible en petits corps
 * (prix, options, tickets).
 *
 * Contrat engine : les variables CSS doivent rester --font-inter (texte) et
 * --font-poppins (titres), elles sont référencées par app/globals.css.
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
