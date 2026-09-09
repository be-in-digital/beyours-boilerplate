"use client"

/**
 * Landing page for an abandoned or refused payment.
 *
 * Referenced as `cancelUrl` by the Stripe and PayPal checkouts, and never
 * written — so cancelling a payment produced a 404 instead of a way back.
 *
 * The cart is deliberately left untouched: the customer cancelled a payment,
 * not their order, and the most likely next action is to try again.
 */

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { XCircle } from "lucide-react"
import { Button } from "@be-in-digital/ui"

function CheckoutCancelContent() {
  const orderId = useSearchParams().get("orderId") ?? undefined

  return (
    <div className="min-h-screen bg-muted px-4 pb-20 pt-32">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-warning text-warning-foreground">
          <XCircle className="h-12 w-12" />
        </div>

        <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tighter text-foreground">
          Paiement <span className="not-italic text-accent-foreground">annulé</span>
        </h1>

        <p className="mb-2 text-lg leading-relaxed text-muted-foreground">
          Vous n&apos;avez pas été débité. Votre panier est intact.
        </p>
        {orderId && (
          <p className="mb-8 text-sm text-muted-foreground">
            La commande #{orderId.slice(-6).toUpperCase()} reste en attente de
            paiement.
          </p>
        )}

        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/checkout">
            <Button className="h-14 rounded-2xl bg-primary px-8 font-black uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary-hover">
              Réessayer le paiement
            </Button>
          </Link>
          <Link href="/cart">
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-border px-8 font-black uppercase tracking-widest transition-all"
            >
              Revoir mon panier
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutCancelContent />
    </Suspense>
  )
}
