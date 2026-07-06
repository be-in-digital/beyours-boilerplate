/**
 * Polices du template « Braise » (fast food poulet) — ZONE CLIENT après
 * application.
 *
 * Titres : Barlow Condensed, condensée d'affiche à l'énergie de rôtisserie
 * urbaine, graisses fortes pour les prix et les noms de menus.
 * Texte : Barlow, la même famille en largeur normale : cohérence totale du
 * ticket de caisse au hero.
 *
 * Contrat engine : les variables CSS doivent rester --font-inter (texte) et
 * --font-poppins (titres), elles sont référencées par app/globals.css.
 */
import { Barlow, Barlow_Condensed } from "next/font/google"

const barlow = Barlow({
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

const barlowCondensed = Barlow_Condensed({
  variable: "--font-poppins",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${barlow.variable} ${barlowCondensed.variable}`
