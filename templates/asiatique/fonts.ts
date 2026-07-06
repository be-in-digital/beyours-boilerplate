/**
 * Polices du template « Izakaya » (asiatique contemporain) — ZONE CLIENT
 * après application.
 *
 * Titres : Zen Kaku Gothic New, gothique dessinée au Japon (latin inclus),
 * la précision calme des enseignes japonaises contemporaines.
 * Texte : Noto Sans, sobre et couvrant tous les alphabets : si la carte
 * mélange latin et idéogrammes, ajouter les subsets nécessaires ici.
 *
 * Contrat engine : les variables CSS doivent rester --font-inter (texte) et
 * --font-poppins (titres), elles sont référencées par app/globals.css.
 */
import { Noto_Sans, Zen_Kaku_Gothic_New } from "next/font/google"

const notoSans = Noto_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-poppins",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${notoSans.variable} ${zenKaku.variable}`
