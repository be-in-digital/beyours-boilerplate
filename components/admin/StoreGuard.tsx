"use client"

import { useQuery } from "convex/react"
import { usePathname } from "next/navigation"
import { useStoreStore } from "@be-in-digital/restaurant"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Store } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Routes that bypass the store guard entirely.
 * These pages must be accessible even without any store.
 */
const BYPASS_ROUTES = ["/dashboard/stores", "/dashboard/settings", "/dashboard/team"]

interface StoreGuardProps {
  children: React.ReactNode
}

/**
 * Store guard component
 * Ensures a store is selected before rendering children.
 * Bypasses the guard for store management and settings routes
 * so users can create their first store.
 */
export function StoreGuard({ children }: StoreGuardProps) {
  const pathname = usePathname()
  const stores = useQuery(api.stores.list)
  const currentStore = useStoreStore((state) => state.currentStore)
  const setCurrentStore = useStoreStore((state) => state.setCurrentStore)

  // Allow certain routes through without any store checks
  const shouldBypass = BYPASS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
  if (shouldBypass) {
    return <>{children}</>
  }

  // Loading state
  if (stores === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  // No stores exist - prompt to create first store
  if (stores.length === 0) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Store className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun établissement</EmptyTitle>
          <EmptyDescription>
            Créez votre premier établissement pour commencer à gérer votre restaurant.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href="/dashboard/stores">Créer mon premier établissement</Link>
        </Button>
      </Empty>
    )
  }

  // Auto-select when only one store exists
  if (stores.length === 1 && !currentStore) {
    setCurrentStore(stores[0])
    return <>{children}</>
  }

  // Stores exist but none selected - show selector
  if (!currentStore) {
    const handleStoreChange = (storeId: string) => {
      const store = stores.find((s: { _id: string }) => s._id === storeId)
      if (store) {
        setCurrentStore(store)
      }
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">Sélectionner un établissement</h2>
          <p className="text-muted-foreground">
            Choisissez l&apos;établissement que vous souhaitez gérer.
          </p>
          <Select onValueChange={handleStoreChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un établissement" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store: { _id: string; name: string }) => (
                <SelectItem key={store._id} value={store._id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  // Store is selected - render children
  return <>{children}</>
}
