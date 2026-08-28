"use client"

/**
 * Public order tracking by opaque token.
 *
 * `order/[orderId]/page.tsx` links here ("Suivre ma commande") and the route did
 * not exist — every one of those links was a 404.
 *
 * The token is the whole authorisation: `kitchenTickets.getByTrackingToken`
 * returns preparation state and store branding only, never customer details, so
 * a shared link leaks nothing about the person who ordered.
 */

import { useParams } from "next/navigation"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { CheckCircle2, ChefHat, Clock, PackageCheck, XCircle } from "lucide-react"
import { Skeleton } from "@be-in-digital/ui/components"
import { Button } from "@/components/ui/button"

const STEPS = [
  { key: "pending", label: "Reçue", icon: Clock },
  { key: "in_progress", label: "En préparation", icon: ChefHat },
  { key: "ready", label: "Prête", icon: PackageCheck },
  { key: "completed", label: "Terminée", icon: CheckCircle2 },
] as const

function stepIndex(status: string) {
  const index = STEPS.findIndex((s) => s.key === status)
  return index === -1 ? 0 : index
}

function formatTime(timestamp?: number) {
  if (!timestamp) return null
  return new Date(timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function TrackOrderPage() {
  const { token } = useParams<{ token: string }>()
  const ticket = useQuery(api.kitchenTickets.getByTrackingToken, { token })

  if (ticket === undefined) {
    return (
      <Wrapper>
        <Skeleton className="mx-auto mb-4 h-10 w-64" />
        <Skeleton className="mx-auto mb-8 h-5 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </Wrapper>
    )
  }

  if (ticket === null) {
    return (
      <Wrapper>
        <XCircle className="mx-auto mb-8 h-12 w-12 text-zinc-300" />
        <h1 className="mb-4 text-3xl font-black uppercase italic tracking-tighter text-zinc-800">
          Commande introuvable
        </h1>
        <p className="mb-8 text-lg text-zinc-500">
          Ce lien de suivi n&apos;est plus valide.
        </p>
        <Link href="/menu">
          <Button className="h-14 rounded-2xl bg-[#0D5C3F] px-8 font-black uppercase tracking-widest text-white transition-all hover:bg-[#0A412D]">
            Retour au menu
          </Button>
        </Link>
      </Wrapper>
    )
  }

  const cancelled = ticket.status === "cancelled"
  const current = stepIndex(ticket.status)

  return (
    <Wrapper>
      {ticket.storeBranding?.name && (
        <p className="mb-2 text-xs font-black uppercase tracking-widest text-zinc-400">
          {ticket.storeBranding.name}
        </p>
      )}

      <h1 className="mb-2 text-4xl font-black uppercase italic tracking-tighter text-zinc-800">
        Commande{" "}
        <span className="not-italic text-orange-500">
          #{ticket.orderNumber}
        </span>
      </h1>

      <p className="mb-10 text-lg text-zinc-500">
        {cancelled
          ? "Cette commande a été annulée."
          : ticket.status === "ready"
            ? ticket.orderType === "delivery"
              ? "Votre commande part en livraison."
              : "Votre commande vous attend."
            : "Suivi en temps réel de votre commande."}
      </p>

      {cancelled ? (
        <div className="rounded-2xl bg-red-50 p-8 text-center">
          <XCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <p className="font-bold text-zinc-700">Commande annulée</p>
        </div>
      ) : (
        <ol className="space-y-3 text-left">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const done = index < current
            const active = index === current
            const stamp =
              step.key === "in_progress"
                ? formatTime(ticket.startedAt)
                : step.key === "ready"
                  ? formatTime(ticket.readyAt)
                  : step.key === "completed"
                    ? formatTime(ticket.completedAt)
                    : formatTime(ticket.createdAt)

            return (
              <li
                key={step.key}
                className={`flex items-center gap-4 rounded-2xl p-4 transition-colors ${
                  active
                    ? "bg-emerald-50 ring-1 ring-emerald-200"
                    : done
                      ? "bg-white"
                      : "bg-white/60"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                    done || active
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-zinc-100 text-zinc-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1">
                  <span
                    className={`block font-black uppercase tracking-wide ${
                      done || active ? "text-zinc-800" : "text-zinc-400"
                    }`}
                  >
                    {step.label}
                  </span>
                  {(done || active) && stamp && (
                    <span className="text-sm text-zinc-400">{stamp}</span>
                  )}
                </span>
                {active && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    En cours
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {ticket.storeBranding?.address && (
        <p className="mt-8 text-sm text-zinc-400">
          {ticket.storeBranding.address}
        </p>
      )}
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 px-4 pb-20 pt-32">
      <div className="mx-auto max-w-lg text-center">{children}</div>
    </div>
  )
}
