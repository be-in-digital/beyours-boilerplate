"use client"

import { useQuery } from "convex/react"
import { useStoreStore } from "@be-in-digital/restaurant"
import { api } from "@/convex/_generated/api"
import type { Store } from "@/lib/admin/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Store selector dropdown component
 * Allows switching between stores using global Zustand store
 */
export function StoreSelector() {
  const stores = useQuery(api.stores.list)
  const currentStore = useStoreStore((state) => state.currentStore)
  const setCurrentStore = useStoreStore((state) => state.setCurrentStore)

  // Loading state
  if (stores === undefined) {
    return (
      <div className="h-9 w-48 rounded-md border bg-muted animate-pulse" />
    )
  }

  // No stores
  if (stores.length === 0) {
    return null
  }

  /**
   * Handle store selection change
   */
  const handleStoreChange = (storeId: string) => {
    const store = stores.find((s: Store) => s._id === storeId)
    if (store) {
      setCurrentStore(store)
    }
  }

  return (
    <Select
      value={currentStore?._id as string}
      onValueChange={handleStoreChange}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Choisir un établissement" />
      </SelectTrigger>
      <SelectContent>
        {stores.map((store: Store) => (
          <SelectItem key={store._id} value={store._id}>
            {store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
