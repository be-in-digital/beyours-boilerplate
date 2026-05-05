"use client"

import Link from "next/link"
import { ShoppingCart, User, MapPin } from "lucide-react"
import { useCartItemCount } from "@be-in-digital/restaurant"

/**
 * Storefront header — visible on every storefront page.
 *
 * Customers can navigate to the menu, see their cart count, and access
 * their account from here. The cart count comes from the Zustand store
 * exposed by `@be-in-digital/restaurant` and updates live.
 */
export function StorefrontHeader() {
  const itemCount = useCartItemCount()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          <span className="inline-block h-8 w-8 rounded-lg bg-zinc-900 dark:bg-zinc-50" />
          <span>BeInDigital</span>
        </Link>

        <nav className="hidden gap-6 md:flex">
          <Link
            href="/menu"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            Menu
          </Link>
          <Link
            href="/stores"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            Restaurants
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/stores"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 md:flex dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Choisir un restaurant"
          >
            <MapPin className="h-5 w-5" />
          </Link>
          <Link
            href="/account"
            className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label="Mon compte"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            aria-label={`Panier (${itemCount} articles)`}
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
