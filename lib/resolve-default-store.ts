/**
 * Resolve the default store slug for legacy redirects.
 *
 * Priority: cookie storeSlug > first active store from Convex.
 * Used only in legacy redirect pages (NOT in /s/[storeSlug]/ pages).
 */

import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { getStoreBySlug } from "@/lib/convex-server"

/** Module-level cached Convex client (deduped across a single render pass) */
const getClient = cache(() => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is required")
  return new ConvexHttpClient(url)
})

/**
 * Returns the default store slug, or null if no store exists.
 */
export async function resolveDefaultStoreSlug(): Promise<string | null> {
  // 1. Try cookie-based store slug
  const cookieSlug = (await cookies()).get("storeSlug")?.value
  if (cookieSlug) {
    const store = await getStoreBySlug(cookieSlug)
    if (store) return store.slug
  }

  // 2. Fallback: query first active store
  const stores = await getClient().query(api.stores.list, {})
  if (!stores || stores.length === 0) return null

  // Find first open store, or first store
  const openStore = stores.find(
    (s: { status?: string }) => s.status === "open",
  )
  return (openStore ?? stores[0]).slug as string
}
