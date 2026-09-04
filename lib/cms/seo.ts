/**
 * CMS SEO Metadata Helper
 *
 * Generates Next.js Metadata from CMS seo block data.
 * Used by generateMetadata() in storefront pages.
 */

import "server-only"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import { LOCALE_COOKIE_NAME, normalizeStoredLocale } from "@be-in-digital/core"
import { getStorePageData } from "@/lib/convex-server"
import { resolveDefaultStoreSlug } from "@/lib/resolve-default-store"

interface SeoOptions {
  pageSlug: string
  fallbackTitle: string
  fallbackDescription?: string
}

/**
 * Generate Metadata from CMS seo block.
 *
 * Two things used to stop this reaching the `<head>` at all. It required a
 * `storeSlug` cookie that nothing writes — a leftover of the removed
 * `/s/[storeSlug]` routing — so every page fell straight through to its
 * hard-coded fallback title. And it read the locale from a cookie named
 * `locale` while the app writes `beid_locale`, so even once it did fetch, the
 * metadata came back in the source language whatever the visitor had picked.
 */
export async function generateCmsMetadata(options: SeoOptions): Promise<Metadata> {
  const { pageSlug, fallbackTitle, fallbackDescription } = options

  try {
    const cookieStore = await cookies()
    // The cookie still wins when it is there — an owner previewing one of
    // several establishments has one — but its absence is the normal case,
    // not a reason to give up.
    const storeSlug =
      cookieStore.get("storeSlug")?.value ?? (await resolveDefaultStoreSlug())
    if (!storeSlug) return { title: fallbackTitle, description: fallbackDescription }

    const locale = normalizeStoredLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
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
