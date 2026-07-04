/**
 * Polices du site — ZONE CLIENT.
 *
 * Remplacer librement les polices ici (next/font/google ou next/font/local).
 * `fontVariables` est appliqué sur <html> par app/layout.tsx ; les variables
 * CSS --font-inter / --font-poppins sont référencées par le thème engine —
 * si vous changez de police, gardez les mêmes noms de variables.
 */
import { Inter, Poppins } from "next/font/google"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
})

export const fontVariables = `${inter.variable} ${poppins.variable}`
