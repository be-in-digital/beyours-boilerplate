/**
 * Dynamic sitemap.xml
 *
 * Queries Convex for open stores, categories, and active products.
 * Generates URLs: /s/{slug}, /s/{slug}/menu, /s/{slug}/menu/{catSlug}, /s/{slug}/product/{prodSlug}
 *
 * Revalidated every hour (ISR) since it uses ConvexHttpClient, not fetch().
 */

import type { MetadataRoute } from "next"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

export const revalidate = 3600 // 1 hour

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  return "https://localhost:3000"
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) return []

  const client = new ConvexHttpClient(url)
  const baseUrl = getBaseUrl()

  const entries: MetadataRoute.Sitemap = []

  try {
    // Get all stores
    const stores = await client.query(api.stores.list, {})
    if (!stores) return []

    const openStores = stores.filter(
      (s: { status?: string }) => s.status === "open",
    )

    for (const store of openStores) {
      const slug = store.slug as string

      // Store homepage
      entries.push({
        url: `${baseUrl}/s/${slug}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 1.0,
      })

      // Menu page
      entries.push({
        url: `${baseUrl}/s/${slug}/menu`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.9,
      })
    }
  } catch (error) {
    console.error("[sitemap] Failed to generate sitemap:", error)
  }

  return entries
}
