"use client"

import { useQuery } from "convex/react"
import { api } from "@repo/backend"
import { StoreCard } from "@/components/storefront/store-card"
import type { StoreDoc } from "@be-in-digital/restaurant"

export default function StoresPage() {
  const stores = useQuery(api.stores.list, {})

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
          Nos restaurants
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Choisissez le restaurant le plus proche pour commander.
        </p>
      </div>

      {stores === undefined ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 rounded-xl bg-zinc-100 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: StoreDoc) => (
            <StoreCard key={store._id} store={store} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Aucun restaurant configure
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Demarrer avec le seed de demo :
      </p>
      <pre className="mt-4 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-zinc-50 dark:bg-zinc-800">
        pnpx convex run seed:runSeed
      </pre>
    </div>
  )
}
