"use client"

import { useStoreStore } from "@be-in-digital/restaurant"
import { useState, useEffect } from "react"
import type { Id } from "@/convex/_generated/dataModel"

/**
 * Hook to get the current admin store ID
 * Returns null if no store is selected
 */
export function useAdminStoreId(): Id<"stores"> | null {
  const currentStore = useStoreStore((state) => state.currentStore)
  return currentStore?._id as Id<"stores"> | null
}

/**
 * Hook to debounce a value
 * Useful for search inputs and other frequent updates
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
