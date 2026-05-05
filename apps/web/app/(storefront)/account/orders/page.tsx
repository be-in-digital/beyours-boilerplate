"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { api } from "@repo/backend"
import {
  formatOrderNumber,
  formatPrice,
  getOrderStatusLabel,
  getOrderStatusColor,
} from "@be-in-digital/restaurant"

export default function CustomerOrdersPage() {
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user?.id
  const orders = useQuery(
    api.orders.getByCustomer,
    userId ? { customerId: userId } : "skip",
  )

  if (isPending || (userId && orders === undefined)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900"
            />
          ))}
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Connectez-vous
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Pour voir l&apos;historique de vos commandes.
        </p>
        <Link
          href="/account"
          className="mt-6 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <Link
        href="/account"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Mon compte
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
        Mes commandes
      </h1>

      {orders && orders.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {orders.map((order) => (
            <li key={order._id}>
              <Link
                href={`/order/${order._id}`}
                className="group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <ShoppingBag className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {formatOrderNumber(order)}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {order.items.length} article
                    {order.items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {formatPrice(order.totalAmount)}
                  </p>
                  <p
                    className="mt-0.5 inline-flex items-center gap-1 text-xs"
                    style={{ color: getOrderStatusColor(order.status) }}
                  >
                    {getOrderStatusLabel(order.status)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
          Aucune commande pour l&apos;instant.{" "}
          <Link href="/menu" className="font-medium underline">
            Commander
          </Link>
        </p>
      )}
    </div>
  )
}
