"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { ArrowLeft, Package, ShoppingBag, Loader2 } from "lucide-react"
import { Badge, Skeleton, Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@be-in-digital/ui/components"
import { formatPrice } from "@be-in-digital/restaurant"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

function getStatusStyle(status: string) {
  switch (status) {
    case "completed":
    case "delivered":
      return "bg-emerald-100 text-emerald-700"
    case "pending":
    case "confirmed":
      return "bg-orange-100 text-orange-700"
    case "cancelled":
      return "bg-red-100 text-red-700"
    default:
      return "bg-zinc-100 text-zinc-500"
  }
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready: "Prête",
    out_for_delivery: "En livraison",
    delivered: "Livrée",
    completed: "Terminée",
    cancelled: "Annulée",
  }
  return labels[status] ?? status
}

export default function OrderHistoryPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in")
    }
  }, [isPending, session, router])

  const orders = useQuery(api.orders.getMyOrders)

  if (isPending || !session?.user) {
    return (
      <div className="min-h-screen bg-[#FDFCF6]">
        <div className="pt-24 pb-20 px-6 bg-[#0D5C3F] rounded-b-[4rem] md:rounded-b-[8rem] flex flex-col items-center">
          <Skeleton className="mb-4 h-10 w-48 rounded-xl" />
          <Skeleton className="h-6 w-64 rounded-lg" />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCF6] text-zinc-900 font-sans overflow-x-hidden pt-20 transition-colors duration-500">
      {/* Hero header */}
      <section className="pt-24 pb-20 px-6 md:px-12 bg-[#0D5C3F] relative overflow-hidden rounded-b-[4rem] md:rounded-b-[8rem]">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-white/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-400/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <Link
            href="/account"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Mon compte
          </Link>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full mb-8 font-black tracking-widest uppercase text-[10px] shadow-lg block mx-auto w-fit">
            Historique
          </Badge>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-8 italic">
            Mes <span className="text-orange-500 not-italic">Commandes</span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Suivez et gérez vos commandes récentes
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Loading */}
        {orders === undefined && (
          <div className="py-20 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D5C3F]" />
          </div>
        )}

        {/* Empty */}
        {orders && orders.length === 0 && (
          <Empty className="rounded-3xl bg-white shadow-sm border border-zinc-100 p-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Package className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>Aucune commande</EmptyTitle>
              <EmptyDescription>
                Votre aventure culinaire n&apos;attend qu&apos;un clic !
              </EmptyDescription>
            </EmptyHeader>
            <Link href="/menu">
              <button className="rounded-xl bg-[#0D5C3F] px-8 py-3 font-black uppercase tracking-widest text-white text-xs hover:bg-[#0a4d35] transition-colors">
                Voir le menu
              </button>
            </Link>
          </Empty>
        )}

        {/* Orders list */}
        {orders && orders.length > 0 && (
          <div className="flex flex-col gap-5">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {orders.map((order: any) => {
              const date = new Date(order.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })

              return (
                <Link
                  key={order._id}
                  href={`/order/${order._id}${order.viewToken ? `?token=${order.viewToken}` : ""}`}
                >
                  <div className="group rounded-2xl bg-white border border-zinc-100 p-4 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:text-[#0D5C3F] transition-colors">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-black text-zinc-900 leading-tight">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {date} — {order.items.length} article{order.items.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#0D5C3F]">
                        {formatPrice(order.total)}
                      </p>
                      <Badge
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest border-none px-2",
                          getStatusStyle(order.status)
                        )}
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
