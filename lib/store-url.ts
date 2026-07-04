/**
 * Store URL helpers
 *
 * Pure utility `storeUrl(slug, path)` + client hook `useStoreUrl()`.
 * All storefront links use these to preserve the storeSlug in the URL.
 */

"use client"

import { useParams } from "next/navigation"
import { useCallback } from "react"

// ---------------------------------------------------------------------------
// Pure utility (can be used server-side or client-side)
// ---------------------------------------------------------------------------

/**
 * Build an absolute path within a store scope.
 * @example storeUrl("my-store", "/menu") → "/s/my-store/menu"
 * @example storeUrl("my-store", "/")     → "/s/my-store"
 */
export function storeUrl(storeSlug: string, path: string = "/"): string {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`
  return `/s/${storeSlug}${normalized}`
}

// ---------------------------------------------------------------------------
// Client hook
// ---------------------------------------------------------------------------

/**
 * Returns a `url(path)` function scoped to the current store slug from the URL.
 * @example const url = useStoreUrl(); <Link href={url("/menu")} />
 */
export function useStoreUrl() {
  const params = useParams<{ storeSlug: string }>()
  const slug = params.storeSlug

  return useCallback(
    (path: string = "/") => storeUrl(slug, path),
    [slug],
  )
}
