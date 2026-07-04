"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useStoreStore } from "@be-in-digital/restaurant"

interface StoreData {
  _id: string
  slug: string
  name: string
  [key: string]: unknown
}

interface StoreProviderProps {
  initialStore: StoreData
  children: ReactNode
}

/**
 * StoreProvider — hydrates useStoreStore from server-resolved store data.
 *
 * Rules:
 * - Idempotent if same slug: does NOT re-hydrate if already matching
 * - Reinitializes if slug changes (cross-store navigation)
 * - Sets `storeSlug` cookie for UX preference (legacy redirects)
 */
export function StoreProvider({ initialStore, children }: StoreProviderProps) {
  const setCurrentStore = useStoreStore((state) => state.setCurrentStore)
  const currentSlug = useStoreStore((state) => state.currentStore?.slug)
  const hydratedSlugRef = useRef<string | null>(null)

  useEffect(() => {
    // Skip if already hydrated with the same store
    if (hydratedSlugRef.current === initialStore.slug && currentSlug === initialStore.slug) {
      return
    }

    // Hydrate Zustand with server-resolved store
    setCurrentStore(initialStore as Parameters<typeof setCurrentStore>[0])
    hydratedSlugRef.current = initialStore.slug

    // Set cookie for legacy redirects (UX preference, not canonical source)
    document.cookie = `storeSlug=${encodeURIComponent(initialStore.slug)};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax;secure`
  }, [initialStore, setCurrentStore, currentSlug])

  return <>{children}</>
}
