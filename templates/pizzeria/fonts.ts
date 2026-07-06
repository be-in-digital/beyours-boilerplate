/**
 * Polices du template « Trattoria » (pizzeria) — ZONE CLIENT après application.
 *
 * Titres : Libre Bodoni, didone italienne (héritage Bodoni, Parme) — l'ADN
 * typographique des enseignes et menus italiens, en version premium.
 * Texte : Figtree, humaniste géométrique chaleureuse et très lisible.
 *
 * Contrat engine : les variables CSS doivent rester --font-inter (texte) et
 * --font-poppins (titres), elles sont référencées par app/globals.css.
 */
import { Figtree, Libre_Bodoni } from "next/font/google"

const figtree = Figtree({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const libreBodoni = Libre_Bodoni({
  variable: "--font-poppins",
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${figtree.variable} ${libreBodoni.variable}`
