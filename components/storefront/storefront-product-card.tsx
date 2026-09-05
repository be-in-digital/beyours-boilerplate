"use client"

import Image from "next/image"
import { Heart, Plus, ShoppingBag } from "lucide-react"
import {
  formatPrice,
  isProductAvailable,
  useLocalizedDocument,
  useTranslation,
} from "@be-in-digital/restaurant"
import type { ProductDoc } from "@be-in-digital/restaurant"
import { Badge } from "@be-in-digital/ui/components"

interface StorefrontProductCardProps {
  product: ProductDoc
  storeId: string
  isStoreOpen: boolean
  isFavorite: boolean
  onToggleFavorite: () => void
  onClick?: () => void
  onAddToCart?: () => void
  otherStore?: boolean
}

/**
 * Product images go through `next/image`, not a raw `<img>`.
 *
 * A menu page renders twelve of these, and each one used to fetch the
 * full-size original an owner uploaded — a 3 MB photograph from a phone,
 * scaled down by the browser, on every card, with no lazy loading and no
 * modern format. `next/image` resizes to the slot, serves AVIF or WebP where
 * the browser accepts it, and defers everything below the fold.
 *
 * Deliberately no `priority`: every grid this card appears in sits under a
 * full-height hero, so no card is above the fold and marking one would only
 * delay the hero that is.
 */
export function StorefrontProductCard({
  product: sourceProduct,
  storeId,
  isStoreOpen,
  isFavorite: favorited,
  onToggleFavorite,
  onClick,
  onAddToCart,
  otherStore,
}: StorefrontProductCardProps) {
  // The card is what the menu, the homepage and the favourites grid all render
  // through, so localising here is what puts a translated catalogue in front
  // of a customer everywhere at once.
  const product = useLocalizedDocument(sourceProduct)
  const { t } = useTranslation()
  const available = isProductAvailable(product)
  const canAdd = available && isStoreOpen && !otherStore

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.04] border border-white/10 hover:border-emerald-100 transition-all group flex flex-col h-full duration-300 ${
        onClick ? "cursor-pointer hover:-translate-y-2.5" : ""
      } ${otherStore ? "opacity-60" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            // The card sits in a four-column grid at desktop, two at tablet,
            // one on a phone. Without this the optimiser is asked for a
            // full-viewport image for a quarter-viewport slot, twelve times a
            // menu page.
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover group-hover:scale-110 transition-all duration-700"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-300">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}

        {/* Badge top-left */}
        <div className="absolute top-4 left-4 flex gap-2">
          {otherStore ? (
            <Badge variant="secondary" className="bg-white/90 backdrop-blur-md border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">
              {t("product.otherRestaurant")}
            </Badge>
          ) : product.isFeatured ? (
            <span className="bg-white/90 backdrop-blur-md text-zinc-800 border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">
              {t("product.popular")}
            </span>
          ) : !available ? (
            <span className="bg-white/90 backdrop-blur-md text-zinc-800 border-none py-1.5 px-3 rounded-lg font-bold uppercase text-[9px] shadow-sm">
              {t("product.unavailable")}
            </span>
          ) : null}
        </div>

        {/* Favorite top-right */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              favorited
                ? "fill-red-500 text-red-500"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          />
        </button>

        {/* Unavailable overlay */}
        {!available && (
          <div className="absolute inset-0 bg-white/40" />
        )}
      </div>

      {/* Content */}
      <div className="p-8 flex flex-col flex-1">
        <h3 className="text-lg font-black tracking-tighter text-zinc-800 leading-tight mb-3 group-hover:text-emerald-700 transition-colors uppercase line-clamp-1">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none mb-1">
              {t("product.price")}
            </span>
            <span className="text-xl font-black text-[#0D5C3F] leading-none">
              {formatPrice(product.price)}
            </span>
          </div>

          {canAdd && onAddToCart ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToCart()
              }}
              className="h-12 w-12 rounded-2xl bg-[#0D5C3F] text-white hover:bg-orange-500 shadow-lg shadow-emerald-900/10 hover:scale-110 transition-all flex items-center justify-center"
            >
              <Plus className="h-6 w-6" />
            </button>
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 text-zinc-300 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
