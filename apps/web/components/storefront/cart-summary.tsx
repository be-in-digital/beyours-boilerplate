"use client"

import { formatPrice } from "@be-in-digital/restaurant"

interface CartSummaryProps {
  subtotal: number
  tax: number
  deliveryFee: number
  total: number
  taxRate: number
}

/**
 * Sticky summary box shown next to the cart line items. Displays
 * subtotal, tax breakdown, delivery, and total.
 */
export function CartSummary({
  subtotal,
  tax,
  deliveryFee,
  total,
  taxRate,
}: CartSummaryProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
        Recapitulatif
      </h2>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Sous-total" value={formatPrice(subtotal)} />
        <Row label={`TVA (${taxRate}%)`} value={formatPrice(tax)} />
        <Row
          label="Livraison"
          value={deliveryFee > 0 ? formatPrice(deliveryFee) : "Offerte"}
          muted={deliveryFee === 0}
        />
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          Total
        </span>
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
          {formatPrice(total)}
        </span>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd
        className={
          muted
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-zinc-900 dark:text-zinc-50"
        }
      >
        {value}
      </dd>
    </div>
  )
}
