import { Suspense } from "react"
import type { Metadata } from "next"
import { generateCmsMetadata } from "@/lib/cms/seo"
import ContactPage from "./_components/ContactContent"

export async function generateMetadata(): Promise<Metadata> {
  return generateCmsMetadata({
    pageSlug: "contact",
    pathname: "/contact",
    fallbackTitle: "Contact — Nous contacter",
    fallbackDescription: "Contactez-nous pour toute question ou réservation.",
  })
}

export default function Contact() {
  return (
    <Suspense>
      <ContactPage />
    </Suspense>
  )
}
