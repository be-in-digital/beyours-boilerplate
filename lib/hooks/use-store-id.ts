"use client"

import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  useStoreStore,
  useCartStore,
  useNearestStore,
} from "@be-in-digital/restaurant"

/**
 * Hook: useStoreId
 *
 * Resolves the current storeId using the priority chain:
 *   localStorage (persisted selection) > nearest store (geolocation) > first store
 *
 * If only 1 store exists, auto-selects it.
 * If multiple stores exist and none is selected, picks the nearest via geolocation.
 */
export function useStoreId(): {
  storeId: string | null
  isLoading: boolean
} {
  const currentStore = useStoreStore((s) => s.currentStore)
  const setCurrentStore = useStoreStore((s) => s.setCurrentStore)
  const cartStoreId = useCartStore((s) => s.storeId)
  const setCartStoreId = useCartStore((s) => s.setStoreId)

  const stores = useQuery(api.stores.list)
  const { nearestStore } = useNearestStore(stores ?? [])

  useEffect(() => {
    if (stores === undefined) return // still loading

    if (currentStore) {
      // Sync cart storeId with store selection
      if (cartStoreId !== currentStore._id) {
        setCartStoreId(currentStore._id)
      }
      return
    }

    if (stores.length === 1) {
      const store = stores[0]!
      setCurrentStore(store)
      setCartStoreId(store._id)
      return
    }

    // Multiple stores, none selected → pick nearest or first
    if (stores.length > 1 && nearestStore) {
      setCurrentStore(nearestStore)
      setCartStoreId(nearestStore._id)
    }
  }, [stores, currentStore, cartStoreId, nearestStore, setCurrentStore, setCartStoreId])

  return {
    storeId: currentStore?._id ?? null,
    isLoading: stores === undefined,
  }
}
