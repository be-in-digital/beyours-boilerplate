"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import { CheckCircle2, Clock, Package, Truck, ChefHat } from "lucide-react"
import { api } from "@repo/backend"
import {
  formatOrderNumber,
  formatPrice,
  getOrderStatusLabel,
  type OrderStatus,
} from "@be-in-digital/restaurant"
import type { Id } from "@repo/backend/dataModel"

const STATUS_STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] =
  [
    { status: "pending", label: "Recue", icon: Clock },
    { status: "confirmed", label: "Confirmee", icon: CheckCircle2 },
    { status: "preparing", label: "Preparation", icon: ChefHat },
    { status: "ready", label: "Prete", icon: Package },
    { status: "completed", label: "Livree", icon: Truck },
  ]

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = use(params)
  const order = useQuery(api.orders.getById, {
    id: orderId as Id<"orders">,
  })

  if (order === undefined) return <Skeleton />
  if (order === null) return <NotFound />

  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.status === order.status,
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Commande confirmee
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Merci pour votre commande. Un email de confirmation vous a ete envoye.
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Numero : {formatOrderNumber(order)}
        </p>
      </div>

      <div className="mt-12 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Suivi en temps reel
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Statut actuel : <strong>{getOrderStatusLabel(order.status)}</strong>
        </p>

        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {STATUS_STEPS.map((step, i) => {
            const Icon = step.icon
            const reached = i <= currentStepIndex && currentStepIndex >= 0
            return (
              <li
                key={step.status}
                className={
                  "flex flex-col items-center gap-2 rounded-lg p-3 text-center text-xs " +
                  (reached
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                    : "bg-zinc-50 text-zinc-500 dark:bg-zinc-900")
                }
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{step.label}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
          Recapitulatif
        </h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-between text-sm">
              <span className="text-zinc-700 dark:text-zinc-300">
                {item.quantity}× {item.productName}
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-50">
                {formatPrice(item.subtotal)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            Total
          </span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/menu"
          className="flex-1 rounded-md bg-zinc-900 py-3 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Commander a nouveau
        </Link>
        <Link
          href="/account/orders"
          className="flex-1 rounded-md border border-zinc-300 py-3 text-center text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Mes commandes
        </Link>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center md:px-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Commande introuvable
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Cette commande n&apos;existe pas ou a ete supprimee.
      </p>
      <Link
        href="/menu"
        className="mt-6 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
      >
        Retour au menu
      </Link>
    </div>
  )
}
