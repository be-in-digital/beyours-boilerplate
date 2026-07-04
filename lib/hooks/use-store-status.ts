"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { isStoreOpen } from "@be-in-digital/restaurant"
import type { Id } from "@/convex/_generated/dataModel"
import type { StoreHoursStatus } from "@be-in-digital/restaurant"

/**
 * Hook: useStoreStatus
 *
 * Queries a store by ID and returns its real-time status:
 * - open/closed based on hours
 * - store status field (draft/open/closed/temporarily_unavailable)
 * - current day hours
 * - available services
 */
export function useStoreStatus(storeId: string | null) {
  const store = useQuery(
    api.stores.getById,
    storeId ? { id: storeId as Id<"stores"> } : "skip"
  )

  const hoursStatus: StoreHoursStatus | null = useMemo(() => {
    if (!store?.hours) return null
    return isStoreOpen(store.hours)
  }, [store])

  const isOpen = store?.status === "open" && (hoursStatus?.isOpen ?? false)

  return {
    store,
    isLoading: store === undefined && storeId !== null,
    isOpen,
    hoursStatus,
    status: store?.status ?? null,
    services: store?.overrides?.services ?? null,
  }
}
