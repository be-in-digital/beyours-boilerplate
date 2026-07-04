"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { LoadingState } from "@/components/admin/LoadingState"
import { PricingView } from "./PricingView"
import { CurrentPlanView } from "./CurrentPlanView"

export function SubscriptionPage() {
  const searchParams = useSearchParams()
  const entitlements = useQuery(api.ownerEntitlements.getMyEntitlements)

  useEffect(() => {
    const status = searchParams.get("status")
    if (status === "success") {
      toast.success("Abonnement activé avec succès")
    } else if (status === "cancel") {
      toast.info("Paiement annulé")
    }
    if (status) {
      window.history.replaceState({}, "", "/admin/subscription")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (entitlements === undefined) {
    return <LoadingState variant="cards" count={3} />
  }

  const isActive =
    entitlements !== null &&
    (entitlements.subscriptionStatus === "active" ||
      entitlements.subscriptionStatus === "trialing")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Abonnement BeInDigital
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isActive
            ? "Gérez votre abonnement et vos fonctionnalités premium."
            : "Choisissez le plan adapté à votre restaurant."}
        </p>
      </div>

      {isActive ? (
        <CurrentPlanView entitlements={entitlements} />
      ) : (
        <PricingView />
      )}
    </div>
  )
}
