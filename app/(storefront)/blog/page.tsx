import { Suspense } from "react"
import type { Metadata } from "next"
import { generateCmsMetadata } from "@/lib/cms/seo"
import BlogPage from "./_components/BlogContent"

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata({
    pageSlug: "blog",
    fallbackTitle: "Blog — Actualités et recettes",
    fallbackDescription: "Nos dernières actualités, recettes et conseils culinaires.",
  })
}

export default function Blog() {
  return (
    <Suspense>
      <BlogPage />
    </Suspense>
  )
}
