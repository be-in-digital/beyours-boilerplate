/**
 * CMS SEO Metadata Helper
 *
 * Generates Next.js Metadata from CMS seo block data.
 * Used by generateMetadata() in storefront pages.
 */

import "server-only"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { getStorePageData } from "@/lib/convex-server"

interface SeoOptions {
  pageSlug: string
  fallbackTitle: string
  fallbackDescription?: string
}

/**
 * Generate Metadata from CMS seo block.
 * Reads storeSlug from cookies, fetches CMS data, extracts SEO fields.
 */
export async function generateCmsMetadata(options: SeoOptions): Promise<Metadata> {
  const { pageSlug, fallbackTitle, fallbackDescription } = options

  try {
    const cookieStore = await cookies()
    const storeSlug = cookieStore.get("storeSlug")?.value
    if (!storeSlug) return { title: fallbackTitle, description: fallbackDescription }

    const locale = cookieStore.get("locale")?.value ?? null
    const { store, cms } = await getStorePageData(storeSlug, pageSlug, locale)
    if (!store || !cms) return { title: fallbackTitle, description: fallbackDescription }

    const seo = cms.block("seo")
    const title = seo.field("metaTitle").text ?? fallbackTitle
    const description = seo.field("metaDescription").text ?? fallbackDescription ?? ""
    const ogImageUrl = seo.field("ogImage").mediaUrl
    const robots = seo.field("robots").text

    return {
      title,
      description,
      ...(robots ? { robots: { index: robots.includes("index"), follow: robots.includes("follow") } } : {}),
      openGraph: {
        title,
        description,
        ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
      },
    }
  } catch {
    return { title: fallbackTitle, description: fallbackDescription }
  }
}
