"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ShoppingBag,
  CheckCircle2,
  Tag,
  X,
  Loader2,
} from "lucide-react"
import { Input, Separator } from "@be-in-digital/ui/components"
import { useCartStore, formatPrice } from "@be-in-digital/restaurant"
import { computeOrderTotals } from "@be-in-digital/convex-functions/orderTotals"

interface AppliedPromo {
  id: string
  code: string
  name: string
  discountAmount: number
}

interface OrderSummaryProps {
  appliedPromo?: AppliedPromo | null
  promoError?: string
  promoLoading?: boolean
  onApplyPromo?: (code: string) => void
  onRemovePromo?: () => void
  deliveryFee?: number | null // number = calculated, null = can't calculate yet, undefined = not delivery
  hasDeliveryAddress?: boolean
  /**
   * Applicable tax rate as a percentage, resolved the same way the server does.
   * The summary used to omit tax entirely while labelling the total "Taxes
   * incluses" — a 20 € basket at 10 % displayed 20 € and was charged 22 €.
   */
  taxRatePercent?: number
}

export function OrderSummary({
  appliedPromo,
  promoError,
  promoLoading,
  onApplyPromo,
  onRemovePromo,
  deliveryFee,
  hasDeliveryAddress,
  taxRatePercent = 0,
}: OrderSummaryProps) {
  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const getItemCount = useCartStore((s) => s.getItemCount)

  const [promoInput, setPromoInput] = useState("")

  const subtotal = getSubtotal()
  const itemCount = getItemCount()

  // Same function the server bills with, so the two cannot drift apart again —
  // including which rate applies to which line.
  const totals = computeOrderTotals({
    subtotal,
    taxRatePercent,
    lines: items.map((item) => ({
      subtotal:
        (item.price + item.options.reduce((s, o) => s + o.priceModifier, 0)) *
        item.quantity,
      taxRatePercent: item.taxRate ?? taxRatePercent,
    })),
    deliveryFee: deliveryFee ?? 0,
    discount: appliedPromo?.discountAmount ?? 0,
  })
  const discount = totals.discount
  const displayTotal = totals.total

  const handleApplyPromo = () => {
    const code = promoInput.trim()
    if (!code || !onApplyPromo) return
    onApplyPromo(code)
  }

  return (
    <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
      {/* Header */}
      <div className="p-8 pb-0">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-zinc-800">
          Votre Box
        </h2>
        <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          <span>Articles ({itemCount})</span>
          <Link href="/cart" className="text-emerald-600 hover:underline">
            Modifier
          </Link>
        </div>
      </div>

      {/* Items */}
      <div className="max-h-[300px] overflow-y-auto p-8">
        <div className="space-y-6">
          {items.map((item, idx) => {
            const optionsTotal = item.options.reduce(
              (s, o) => s + o.priceModifier,
              0
            )
            const lineTotal = (item.price + optionsTotal) * item.quantity

            return (
              <div
                key={`${item.productId}-${item.options.map((o) => o.choice).join("-")}-${idx}`}
                className="flex gap-4"
              >
                {/* Image */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-zinc-300" />
                    </div>
                  )}
                  {/* Quantity badge */}
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-lg bg-[#0D5C3F] text-[10px] font-black text-white">
                    {item.quantity}
                  </div>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black uppercase tracking-tight text-zinc-800">
                    {item.name}
                  </h4>
                  {item.options.length > 0 && (
                    <p className="mt-0.5 truncate text-[10px] font-black uppercase text-emerald-600">
                      +{" "}
                      {item.options.map((o) => o.choice).join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-bold text-zinc-400">
                    {formatPrice(lineTotal)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Promo Code */}
      {onApplyPromo && (
        <div className="px-8 pb-2">
          <Separator className="mb-6 bg-zinc-100" />

          {appliedPromo ? (
            <div className="flex items-center justify-between rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <Tag className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                    {appliedPromo.code}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600">
                    {appliedPromo.name} — -{formatPrice(appliedPromo.discountAmount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onRemovePromo}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-zinc-400">
                Code promo
              </label>
              <div className="flex gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                  placeholder="Entrez votre code"
                  className="h-12 flex-1 rounded-xl border-zinc-100 bg-zinc-50 px-4 text-sm font-bold uppercase tracking-widest transition-all focus:bg-white focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={!promoInput.trim() || promoLoading}
                  className="flex h-12 items-center justify-center rounded-xl bg-[#0D5C3F] px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#0A412D] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {promoLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Appliquer"
                  )}
                </button>
              </div>
              {promoError && (
                <p className="mt-2 text-xs font-medium text-rose-500">
                  {promoError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="p-8 pt-0">
        <Separator className="my-8 bg-zinc-100" />

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span>Sous-total</span>
            <span className="text-zinc-800">{formatPrice(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-emerald-600">
              <span className="flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Réduction
              </span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span>Livraison</span>
            {orderType !== "delivery" ? (
              <span className="font-black text-emerald-700">
                GRATUIT (Retrait)
              </span>
            ) : !hasDeliveryAddress ? (
              <span className="text-zinc-500">Renseignez votre adresse</span>
            ) : typeof deliveryFee === "number" && deliveryFee === 0 ? (
              <span className="font-black text-emerald-700">OFFERTE</span>
            ) : typeof deliveryFee === "number" && deliveryFee > 0 ? (
              <span className="text-zinc-800">{formatPrice(deliveryFee)}</span>
            ) : (
              <span className="text-zinc-500">Calculée à la validation</span>
            )}
          </div>

          {totals.taxAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold uppercase tracking-widest text-zinc-400">
                {/* "dont" — the tax is inside the prices above, not added to
                    them. One rate is named; a basket mixing rates is not. */}
                dont TVA
                {totals.taxBreakdown.length === 1
                  ? ` (${totals.taxBreakdown[0]!.ratePercent} %)`
                  : ""}
              </span>
              <span className="text-zinc-800">
                {formatPrice(totals.taxAmount)}
              </span>
            </div>
          )}

          <Separator className="bg-zinc-100" />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xl font-black uppercase tracking-tighter text-zinc-800">
              Total
            </span>
            <div className="text-right">
              <p className="text-3xl font-black leading-none tracking-tighter text-[#0D5C3F]">
                {formatPrice(displayTotal)}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                {totals.taxAmount > 0 ? "TVA incluse" : "Non soumis à la TVA"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-100 bg-[#0D5C3F]/[0.02] p-8">
        <div className="flex items-center gap-3 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Délai estimé : 25-35 mins
          </p>
        </div>
      </div>
    </div>
  )
}
