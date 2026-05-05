"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@repo/backend"
import { ArrowRight } from "lucide-react"

/**
 * Preview of categories on the landing page. Pulls live from Convex
 * — first active store, then its categories sorted by `sortOrder`.
 */
export function CategoryPreview() {
  const stores = useQuery(api.stores.list, {})
  const firstStore = stores?.[0]
  const categories = useQuery(
    api.categories.listActiveWithCounts,
    firstStore ? { storeId: firstStore._id } : "skip",
  )

  if (!stores || !categories) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-zinc-100 dark:bg-zinc-900"
            />
          ))}
        </div>
      </section>
    )
  }

  if (categories.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <p className="text-zinc-500">
          Aucune categorie configuree. Run{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-800">
            pnpx convex run seed:runSeed
          </code>{" "}
          pour seeder le demo store.
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Nos categories
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {firstStore?.name} · {categories.length} categories ·{" "}
            {categories.reduce((sum, c) => sum + (c.productCount ?? 0), 0)}{" "}
            produits
          </p>
        </div>
        <Link
          href="/menu"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          Voir tout
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {categories.slice(0, 6).map((cat) => (
          <Link
            key={cat._id}
            href={`/menu?category=${cat.slug}`}
            className="group rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {cat.name}
            </h3>
            {cat.description && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {cat.description}
              </p>
            )}
            <p className="mt-4 text-sm text-zinc-500">
              {cat.productCount ?? 0} produit
              {(cat.productCount ?? 0) > 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
