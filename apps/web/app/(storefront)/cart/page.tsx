"use client"

import Link from "next/link"
import { ShoppingBag, ArrowRight } from "lucide-react"
import { useCart, useCartItems } from "@be-in-digital/restaurant"
import { CartItem } from "@/components/storefront/cart-item"
import { CartSummary } from "@/components/storefront/cart-summary"

const TAX_RATE = 10 // % — should come from store config in real impl
const DELIVERY_FEE = 0 // pickup default

export default function CartPage() {
  const items = useCartItems()
  const { getSummary } = useCart()
  const summary = getSummary(TAX_RATE, DELIVERY_FEE)

  if (items.length === 0) return <EmptyCart />

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
        Mon panier
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {summary.itemCount} article{summary.itemCount > 1 ? "s" : ""}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        <ul className="rounded-xl border border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
          {items.map((item) => (
            <CartItem key={item.productId} item={item} />
          ))}
        </ul>

        <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <CartSummary
            subtotal={summary.subtotal}
            tax={summary.tax}
            deliveryFee={summary.deliveryFee}
            total={summary.total}
            taxRate={TAX_RATE}
          />
          <Link
            href="/checkout"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Passer commande
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/menu"
            className="block text-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
        <ShoppingBag className="h-10 w-10 text-zinc-400" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Votre panier est vide
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Decouvrez notre menu et ajoutez vos plats favoris.
      </p>
      <Link
        href="/menu"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Voir le menu
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
