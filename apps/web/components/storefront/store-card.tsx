"use client"

import Link from "next/link"
import { MapPin, Phone, Clock } from "lucide-react"
import {
  formatStoreAddress,
  isStoreOpen,
  type StoreDoc,
} from "@be-in-digital/restaurant"

/**
 * Compact card displaying a single store (location, hours, contact).
 * Used in the /stores selector list.
 */
export function StoreCard({ store }: { store: StoreDoc }) {
  // Defensive : isStoreOpen calls hours.find — older Convex docs may not
  // have a properly-shaped hours array. Default to "ferme" if it throws.
  let open = false
  try {
    open = Array.isArray(store.hours) ? isStoreOpen(store) : false
  } catch {
    open = false
  }

  return (
    <Link
      href={`/menu?store=${store.slug}`}
      className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {store.name}
        </h3>
        <StatusPill open={open} />
      </div>

      {store.description && (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {store.description}
        </p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <dd>{formatStoreAddress(store.address)}</dd>
        </div>
        {store.phone && (
          <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
            <Phone className="mt-0.5 h-4 w-4 shrink-0" />
            <dd>{store.phone}</dd>
          </div>
        )}
        <div className="flex items-start gap-2 text-zinc-600 dark:text-zinc-400">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <dd>{open ? "Ouvert maintenant" : "Ferme"}</dd>
        </div>
      </dl>

      <p className="mt-6 text-sm font-medium text-zinc-900 group-hover:underline dark:text-zinc-50">
        Commander dans ce restaurant →
      </p>
    </Link>
  )
}

function StatusPill({ open }: { open: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
        (open
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")
      }
    >
      <span
        className={
          "inline-block h-1.5 w-1.5 rounded-full " +
          (open ? "bg-emerald-500" : "bg-zinc-400")
        }
      />
      {open ? "Ouvert" : "Ferme"}
    </span>
  )
}
