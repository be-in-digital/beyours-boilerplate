/**
 * Site fonts — CLIENT ZONE.
 *
 * Swap the fonts freely here (next/font/google or next/font/local).
 * `fontVariables` is applied to <html> by app/layout.tsx; the CSS variables
 * --font-inter / --font-poppins are referenced by the engine theme — if you
 * change the typeface, keep the same variable names.
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
