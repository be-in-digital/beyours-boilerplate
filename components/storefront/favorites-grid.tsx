"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Skeleton, Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@be-in-digital/ui/components"
import {
  isProductAvailable,
  useCartStore,
  useLocalizedDocuments,
} from "@be-in-digital/restaurant"
import type { ProductDoc, NewCartItem } from "@be-in-digital/restaurant"
import { useFavorites } from "@/lib/hooks/use-favorites"
import { useStoreStatus } from "@/lib/hooks/use-store-status"
import { StorefrontProductCard } from "./storefront-product-card"
import { toast } from "sonner"

interface FavoritesGridProps {
  storeId: string
}

export function FavoritesGrid({ storeId }: FavoritesGridProps) {
  const router = useRouter()
  const { favorites, isFavorite, toggleFavorite } = useFavorites()
  const addItem = useCartStore((s: { addItem: (item: NewCartItem) => void }) => s.addItem)
  const { isOpen } = useStoreStatus(storeId)

  // All favorite product IDs (all stores)
  const allProductIds = useMemo(
    () => favorites.map((f: { productId: string }) => f.productId as Id<"products">),
    [favorites]
  )

  // Fetch all favorite products in one batch
  const rawProducts = useQuery(
    api.products.getManyByIds,
    allProductIds.length > 0 ? { ids: allProductIds } : "skip"
  )
  // Localised before the split, so both the card and the line the quick-add
  // writes into the cart carry the same language.
  const localized = useLocalizedDocuments<ProductDoc>(
    rawProducts as ProductDoc[] | undefined
  )
  const products = rawProducts === undefined ? undefined : localized

  // Split into current store and other stores
  const { currentStoreFavorites, otherStoreFavorites } = useMemo(() => {
    if (!products) return { currentStoreFavorites: [] as ProductDoc[], otherStoreFavorites: [] as ProductDoc[] }

    const current: ProductDoc[] = []
    const other: ProductDoc[] = []

    for (const product of products) {
      if (product.storeId === storeId) {
        current.push(product)
      } else {
        other.push(product)
      }
    }

    return { currentStoreFavorites: current, otherStoreFavorites: other }
  }, [products, storeId])

  const handleAddToCart = (product: ProductDoc) => {
    if (!isProductAvailable(product) || !isOpen) return

    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      taxRate: product.taxRate,
      categoryId: product.categoryId,
      quantity: 1,
      options: [],
      imageUrl: product.images?.[0],
    })
    toast.success(`${product.name} ajouté à la Box`)
  }

  // Loading
  if (allProductIds.length > 0 && products === undefined) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[2.5rem] border border-zinc-100 bg-white">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-8 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1">
                  <Skeleton className="h-2 w-8" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty
  if (favorites.length === 0) {
    return (
      <Empty className="py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Heart className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun favori</EmptyTitle>
          <EmptyDescription>Ajoutez des plats à vos favoris depuis le menu.</EmptyDescription>
        </EmptyHeader>
        <Link href="/menu" className="text-primary hover:underline text-sm">
          Voir le menu
        </Link>
      </Empty>
    )
  }

  return (
    <div className="space-y-12">
      {/* Current store favorites */}
      {currentStoreFavorites.length > 0 && (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {currentStoreFavorites.map((product) => (
            <StorefrontProductCard
              key={product._id}
              product={product}
              storeId={storeId}
              isStoreOpen={isOpen}
              isFavorite={isFavorite(product._id, storeId)}
              onToggleFavorite={() => toggleFavorite(product._id, storeId)}
              onClick={() => router.push(`/product/${product._id}`)}
              onAddToCart={() => handleAddToCart(product)}
            />
          ))}
        </div>
      )}

      {/* Other store favorites */}
      {otherStoreFavorites.length > 0 && (
        <div>
          <h3 className="mb-8 font-black text-xs uppercase tracking-widest text-zinc-400">
            Autres restaurants
          </h3>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {otherStoreFavorites.map((product) => (
              <StorefrontProductCard
                key={product._id}
                product={product}
                storeId={product.storeId}
                isStoreOpen={false}
                isFavorite={isFavorite(product._id, product.storeId)}
                onToggleFavorite={() => toggleFavorite(product._id, product.storeId)}
                otherStore
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
