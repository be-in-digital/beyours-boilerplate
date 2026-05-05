"use client"

import Link from "next/link"
import { formatPrice, type ProductDoc } from "@be-in-digital/restaurant"
import { AddToCartButton } from "./add-to-cart-button"

/**
 * Product card for the menu grid. Shows image (or fallback gradient),
 * name, description, price, and a quick add-to-cart button.
 *
 * Clicking the card body navigates to the product detail; the add
 * button stops propagation to add directly without leaving the page.
 */
export function ProductCard({ product }: { product: ProductDoc }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <Link
        href={`/menu/${product._id}`}
        className="flex flex-col"
        aria-label={product.name}
      >
        <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          {product.images.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700" />
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {product.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatPrice(product.price)}
            </span>
            {product.preparationTime && (
              <span className="text-xs text-zinc-500">
                {product.preparationTime} min
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <AddToCartButton product={product} variant="compact" />
      </div>
    </article>
  )
}
