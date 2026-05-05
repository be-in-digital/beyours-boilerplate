"use client"

import { useState } from "react"
import { Plus, Check } from "lucide-react"
import { toast } from "sonner"
import {
  useCart,
  useCartStoreId,
  type ProductDoc,
} from "@be-in-digital/restaurant"

interface AddToCartButtonProps {
  product: ProductDoc
  quantity?: number
  variant?: "compact" | "full"
}

/**
 * Adds a product to the cart via Zustand store from
 * `@be-in-digital/restaurant`. Shows a brief success state and a toast.
 *
 * Refuses to mix products from different stores (the cart is single-store
 * by design — clears + warns the user if they try).
 */
export function AddToCartButton({
  product,
  quantity = 1,
  variant = "full",
}: AddToCartButtonProps) {
  const { addItem, clearCart, setStoreId } = useCart()
  const cartStoreId = useCartStoreId()
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (cartStoreId && cartStoreId !== product.storeId) {
      const proceed = confirm(
        "Votre panier contient des articles d'un autre restaurant. Le vider pour ajouter ce produit ?",
      )
      if (!proceed) return
      clearCart()
    }

    setStoreId(product.storeId)
    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity,
      options: [],
      imageUrl: product.images[0],
    })

    setAdded(true)
    toast.success(`${product.name} ajoute au panier`)
    setTimeout(() => setAdded(false), 1500)
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className={
          "flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors " +
          (added
            ? "bg-emerald-500 text-white"
            : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200")
        }
      >
        {added ? (
          <>
            <Check className="h-4 w-4" /> Ajoute
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> Ajouter
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={
        "flex h-12 items-center justify-center gap-2 rounded-md px-6 text-base font-medium transition-colors " +
        (added
          ? "bg-emerald-500 text-white"
          : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200")
      }
    >
      {added ? (
        <>
          <Check className="h-5 w-5" /> Ajoute au panier
        </>
      ) : (
        <>
          <Plus className="h-5 w-5" /> Ajouter au panier
        </>
      )}
    </button>
  )
}
