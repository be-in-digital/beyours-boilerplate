/**
 * SEO helpers for generateMetadata()
 *
 * Reads CMS seo block fields and builds Next.js Metadata objects.
 */

import "server-only"
import { headers } from "next/headers"
import type { Metadata } from "next"
import type { ServerCmsPageResult } from "@/lib/cms/server"

interface SeoOptions {
  /** CMS page data (from fetchCmsPage or getStorePageData) */
  cms: ServerCmsPageResult
  /** Fallback title if CMS is empty */
  fallbackTitle: string
  /** Fallback description if CMS is empty */
  fallbackDescription?: string
  /** Fallback OG image URL (absolute) if CMS is empty */
  fallbackOgImage?: string
  /** Current path (e.g. /s/my-store/menu) for canonical URL */
  pathname: string
}

/**
 * Resolve the base URL for canonical/OG from request host.
 * Priority: request host via headers() → NEXT_PUBLIC_SITE_URL env var.
 */
async function resolveBaseUrl(): Promise<string> {
  try {
    const h = await headers()
    const host = h.get("host")
    const rawProto = h.get("x-forwarded-proto") ?? "https"
    const proto = rawProto === "http" || rawProto === "https" ? rawProto : "https"
    if (host) return `${proto}://${host}`
  } catch {
    // headers() may fail outside request context (build time)
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, "")

  return "https://localhost:3000"
}

/**
 * Build Next.js Metadata from CMS SEO block + fallbacks.
 */
export async function buildSeoMetadata(options: SeoOptions): Promise<Metadata> {
  const { cms, fallbackTitle, fallbackDescription, fallbackOgImage, pathname } = options
  const baseUrl = await resolveBaseUrl()

  const seo = cms.block("seo")
  const metaTitle = seo.field("metaTitle").text || fallbackTitle
  const metaDescription = seo.field("metaDescription").text || fallbackDescription || ""
  const robotsValue = seo.field("robots").text || "index, follow"
  const ogImageUrl = seo.field("ogImage").mediaUrl

  // Normalize OG image to absolute URL
  let resolvedOgImage = ogImageUrl || fallbackOgImage
  if (resolvedOgImage && !resolvedOgImage.startsWith("http")) {
    resolvedOgImage = `${baseUrl}${resolvedOgImage.startsWith("/") ? "" : "/"}${resolvedOgImage}`
  }

  // Parse robots directive
  const isNoIndex = robotsValue.includes("noindex")
  const isNoFollow = robotsValue.includes("nofollow")

  const canonical = `${baseUrl}${pathname}`

  return {
    title: metaTitle,
    description: metaDescription || undefined,
    alternates: {
      canonical,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription || undefined,
      url: canonical,
      ...(resolvedOgImage
        ? { images: [{ url: resolvedOgImage }] }
        : {}),
    },
    robots: {
      index: !isNoIndex,
      follow: !isNoFollow,
    },
  }
}
