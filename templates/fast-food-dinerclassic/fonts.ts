/**
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: Alfa Slab One. Body: Epilogue.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
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
