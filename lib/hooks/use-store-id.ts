"use client"

import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  useStorefrontStoreSelection,
  useCartStore,
  useNearestStore,
  type StoreDoc,
} from "@be-in-digital/restaurant"

/**
 * Hook: useStoreId
 *
 * Resolves the store the visitor is browsing:
 *   persisted selection > nearest store (geolocation) > first store
 *
 * The selection is an id, and the document comes back from Convex, so a
 * renamed store or a change of opening hours reaches the visitor on the next
 * render. Storing the whole document meant it stayed frozen in localStorage.
 *
 * The visitor is never asked for their position here. If they granted it
 * earlier the nearest store wins; otherwise the first one does. Asking on
 * arrival - which is what this used to do on every storefront page - puts a
 * permission prompt in front of someone who came to read a menu.
 *
 * Every candidate here comes from `stores.list`, which returns only published
 * establishments. That is what keeps the automatic selection off a draft: this
 * hook picks blind, so a draft in the list would be picked like any other, and
 * the visitor would land on a restaurant nobody has opened yet.
 */
export function useStoreId(): {
  storeId: string | null
  store: StoreDoc | null
  isLoading: boolean
} {
  const storeId = useStorefrontStoreSelection((s) => s.storeId)
  const setStoreId = useStorefrontStoreSelection((s) => s.setStoreId)
  const cartStoreId = useCartStore((s) => s.storeId)
  const setCartStoreId = useCartStore((s) => s.setStoreId)

  const stores = useQuery(api.stores.list)

  const store = (stores as StoreDoc[] | undefined)?.find((s) => s._id === storeId) ?? null
  const needsResolution = !!stores && !store

  const { nearestStore } = useNearestStore(stores ?? [], {
    useGrantedLocation: needsResolution && (stores?.length ?? 0) > 1,
  })

  useEffect(() => {
    if (!stores) return // still loading

    if (store) {
      // Sync cart storeId with store selection
      if (cartStoreId !== store._id) {
        setCartStoreId(store._id)
      }
      return
    }

    // Nothing selected, or a selection that no longer exists. `nearestStore` is
    // the closest one when the visitor shared their position and simply the
    // first otherwise.
    const next = nearestStore ?? stores[0]
    if (next) {
      setStoreId(next._id)
      setCartStoreId(next._id)
    }
  }, [stores, store, cartStoreId, nearestStore, setStoreId, setCartStoreId])

  return {
    storeId: store?._id ?? null,
    store,
    isLoading: stores === undefined,
  }
}
