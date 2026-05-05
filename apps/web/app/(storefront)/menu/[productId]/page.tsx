"use client"

import { use, useState } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { ArrowLeft, Clock, Tag } from "lucide-react"
import { api } from "@repo/backend"
import {
  formatPrice,
  isProductAvailable,
  type ProductDoc,
} from "@be-in-digital/restaurant"
import { AddToCartButton } from "@/components/storefront/add-to-cart-button"
import type { Id } from "@repo/backend/dataModel"

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = use(params)
  const product = useQuery(api.products.getById, {
    id: productId as Id<"products">,
  })

  const [quantity, setQuantity] = useState(1)

  if (product === undefined) return <ProductDetailSkeleton />
  if (product === null) return <NotFound />

  const available = isProductAvailable(product as ProductDoc)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Link
        href="/menu"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au menu
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
          {product.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700" />
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
            {product.name}
          </h1>

          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {formatPrice(product.price)}
          </p>

          {product.description && (
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>
          )}

          <dl className="mt-6 grid gap-3 text-sm">
            {product.preparationTime && (
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Clock className="h-4 w-4" />
                <dt className="sr-only">Temps de preparation</dt>
                <dd>{product.preparationTime} minutes</dd>
              </div>
            )}
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <Tag className="h-4 w-4" />
              <dt className="sr-only">TVA</dt>
              <dd>TVA {product.taxRate}%</dd>
            </div>
          </dl>

          {!available ? (
            <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Ce produit n&apos;est pas disponible actuellement.
            </div>
          ) : (
            <div className="mt-8 flex items-center gap-3">
              <QuantitySelector value={quantity} onChange={setQuantity} />
              <AddToCartButton
                product={product as ProductDoc}
                quantity={quantity}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function QuantitySelector({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex h-12 w-12 items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        disabled={value <= 1}
        aria-label="Diminuer la quantite"
      >
        −
      </button>
      <span className="flex h-12 w-12 items-center justify-center font-medium text-zinc-900 dark:text-zinc-50">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-12 w-12 items-center justify-center text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Augmenter la quantite"
      >
        +
      </button>
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="space-y-4">
          <div className="h-10 w-3/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-6 w-1/4 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
          <div className="h-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Produit introuvable
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Ce produit n&apos;existe pas ou a ete supprime.
      </p>
      <Link
        href="/menu"
        className="mt-6 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Retour au menu
      </Link>
    </div>
  )
}
