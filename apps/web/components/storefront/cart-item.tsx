"use client"

import { Minus, Plus, Trash2 } from "lucide-react"
import {
  formatPrice,
  useCart,
  type CartItem as CartItemType,
} from "@be-in-digital/restaurant"

/**
 * Single line item inside the cart page. Lets the customer adjust
 * quantity (1..N) or remove the item entirely.
 */
export function CartItem({ item }: { item: CartItemType }) {
  const { updateQuantity, removeItem } = useCart()
  const lineTotal = item.price * item.quantity

  return (
    <li className="flex gap-4 border-b border-zinc-200 py-4 last:border-0 dark:border-zinc-800">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-700" />
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium text-zinc-900 dark:text-zinc-50">
            {item.name}
          </h3>
          <span className="text-sm text-zinc-500">
            {formatPrice(item.price)}
          </span>
        </div>

        {item.options.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {item.options
              .map((o) => `${o.name}: ${o.choice}`)
              .join(" · ")}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between pt-3">
          <div className="flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, Math.max(1, item.quantity - 1))
              }
              disabled={item.quantity <= 1}
              className="flex h-8 w-8 items-center justify-center text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Diminuer"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="flex h-8 w-10 items-center justify-center text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateQuantity(item.productId, item.quantity + 1)
              }
              className="flex h-8 w-8 items-center justify-center text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Augmenter"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatPrice(lineTotal)}
            </span>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
              aria-label="Retirer du panier"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}
