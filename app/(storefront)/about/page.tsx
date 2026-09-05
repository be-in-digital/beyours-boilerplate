import { Suspense } from "react"
import type { Metadata } from "next"
import { generateCmsMetadata } from "@/lib/cms/seo"
import AboutPage from "./_components/AboutContent"

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata({
    pageSlug: "about",
    pathname: "/about",
    fallbackTitle: "À propos — Notre histoire",
    fallbackDescription: "Découvrez notre histoire, nos valeurs et notre passion pour la cuisine.",
  })
}

export default function About() {
  return (
    <Suspense>
      <AboutPage />
    </Suspense>
  )
}
