import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import { cookies } from "next/headers"
import { Providers } from "./providers"
import { EnvCheck } from "@/components/env-check"
import "./globals.css"

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

export const metadata: Metadata = {
  title: "BeInDigital",
  description: "Restaurant Management Platform",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const lang = cookieStore.get("beid_locale")?.value || "fr"

  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${inter.variable} ${poppins.variable}`}
    >
      <body className="antialiased">
        <Providers>{children}</Providers>
        <EnvCheck />
      </body>
    </html>
  )
}
