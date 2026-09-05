import { Suspense } from "react"
import type { Metadata } from "next"
import { generateCmsMetadata } from "@/lib/cms/seo"
import LandingPage from "./_components/HomepageContent"

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata({
    pageSlug: "homepage",
    pathname: "/",
    fallbackTitle: "Restaurant — Commandez en ligne",
    fallbackDescription: "Découvrez notre menu et commandez vos plats préférés en ligne.",
  })
}

export default function HomePage() {
  return (
    <Suspense>
      <LandingPage />
    </Suspense>
  )
}
