"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { isStoreOpen, resolveStoreHours } from "@be-in-digital/restaurant"
import { resolveStoreServices } from "@be-in-digital/convex-schema"
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
 *
 * Two things it used to get wrong, both of them settings the dashboard writes
 * and this hook did not read (#169):
 *
 * - It took `store.hours` unconditionally, so `useGlobalHours` decided nothing.
 *   An owner who edited the global week and left every location on "horaires
 *   globaux" changed nothing a visitor could see — the storefront kept showing
 *   the hard-coded 09:00–22:00 that `stores.create` seeds.
 * - It compared against the visitor's own clock. `globalSettings.timezone` was
 *   written and never read, so a customer abroad got the wrong answer and
 *   anyone could change it by changing their system clock.
 * - It returned `store.overrides.services` raw, and that override is
 *   `undefined` on every establishment that has not customised it. The
 *   order-type selector read `undefined` as "offer everything", so a restaurant
 *   that does not deliver still showed Livraison.
 */
export function useStoreStatus(storeId: string | null) {
  const store = useQuery(
    api.stores.getById,
    storeId ? { id: storeId as Id<"stores"> } : "skip"
  )
  // Public query: tax rate, delivery config and the opening rules, with the
  // Uber Direct credentials stripped. The storefront needs it before sign-in.
  const globalSettings = useQuery(api.globalSettings.get)

  const hoursStatus: StoreHoursStatus | null = useMemo(() => {
    if (!store) return null
    const hours = resolveStoreHours(store, globalSettings)
    if (hours.length === 0) return null
    return isStoreOpen(hours, new Date(), globalSettings?.timezone)
  }, [store, globalSettings])

  const isOpen = store?.status === "open" && (hoursStatus?.isOpen ?? false)

  return {
    store,
    isLoading: store === undefined && storeId !== null,
    isOpen,
    hoursStatus,
    status: store?.status ?? null,
    // `null` while the two queries are in flight — the selector renders
    // nothing rather than guessing, and guessing is what offered a service the
    // restaurant does not run.
    services:
      store && globalSettings !== undefined
        ? resolveStoreServices(store, globalSettings)
        : null,
  }
}
