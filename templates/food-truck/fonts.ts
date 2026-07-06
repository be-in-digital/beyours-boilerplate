/**
 * Polices du template « Convoi » (food truck) — ZONE CLIENT après application.
 *
 * Titres : Big Shoulders, condensée à l'énergie street et industrielle,
 * l'esprit lettrage de carrosserie et ardoise du jour.
 * Texte : Work Sans, grotesque sobre et robuste, très lisible dehors comme
 * sur mobile.
 *
 * Contrat engine : les variables CSS doivent rester --font-inter (texte) et
 * --font-poppins (titres), elles sont référencées par app/globals.css.
 */
import { Big_Shoulders, Work_Sans } from "next/font/google"

const workSans = Work_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const bigShoulders = Big_Shoulders({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${workSans.variable} ${bigShoulders.variable}`
