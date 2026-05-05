"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@repo/backend"
import { CategoryNav } from "@/components/storefront/category-nav"
import { ProductCard } from "@/components/storefront/product-card"
import type { ProductDoc } from "@be-in-digital/restaurant"

function MenuContent() {
  const params = useSearchParams()
  const categorySlug = params.get("category")
  const storeSlug = params.get("store")

  const stores = useQuery(api.stores.list, {})
  const store = storeSlug
    ? stores?.find((s) => s.slug === storeSlug)
    : stores?.[0]

  const categories = useQuery(
    api.categories.listActiveWithCounts,
    store ? { storeId: store._id } : "skip",
  )
  const products = useQuery(
    api.products.list,
    store ? { storeId: store._id } : "skip",
  )

  if (!store || !categories || !products) {
    return <MenuSkeleton />
  }

  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null

  const visibleProducts = (products as ProductDoc[]).filter((p) => {
    if (!p.isActive) return false
    if (activeCategory) return p.categoryId === activeCategory._id
    return true
  })

  return (
    <>
      <CategoryNav categories={categories} />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
            {activeCategory ? activeCategory.name : store.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {visibleProducts.length} produit
            {visibleProducts.length > 1 ? "s" : ""}
            {activeCategory && activeCategory.description
              ? ` · ${activeCategory.description}`
              : ""}
          </p>
        </div>

        {visibleProducts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
            Aucun produit dans cette categorie.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function MenuSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-72 rounded-xl bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <MenuContent />
    </Suspense>
  )
}
