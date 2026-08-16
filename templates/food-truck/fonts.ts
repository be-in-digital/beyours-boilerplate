/**
 * Fonts for the "Convoi" template (food truck) — CLIENT ZONE once applied.
 *
 * Headings: Big Shoulders, a condensed with street and industrial energy —
 * the spirit of bodywork lettering and the daily chalkboard.
 * Body: Work Sans, a plain sturdy grotesque, very readable outdoors and on
 * mobile alike.
 *
 * Engine contract: the CSS variables must stay --font-inter (body) and
 * --font-poppins (headings), they are referenced by app/globals.css.
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
