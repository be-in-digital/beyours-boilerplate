"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { loadStripe } from "@stripe/stripe-js"
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"
import { useAction, useMutation } from "convex/react"
import { Lock, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { api } from "@repo/backend"
import {
  formatPrice,
  useCart,
  useCartItems,
  useCartStoreId,
} from "@be-in-digital/restaurant"
import {
  CheckoutForm,
  type CheckoutFormData,
} from "@/components/storefront/checkout-form"
import { CartSummary } from "@/components/storefront/cart-summary"
import type { Id } from "@repo/backend/dataModel"

const TAX_RATE = 10

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCartItems()
  const storeId = useCartStoreId()
  const { getSummary } = useCart()
  const summary = getSummary(TAX_RATE, 0)

  const createPaymentIntent = useAction(api.stripe.createPaymentIntent)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [intentError, setIntentError] = useState<string | null>(null)

  const totalCents = useMemo(
    () => Math.round(summary.total * 100),
    [summary.total],
  )

  useEffect(() => {
    if (items.length === 0 || !storeId) return
    if (clientSecret) return

    createPaymentIntent({
      amount: totalCents,
      currency: "eur",
      metadata: { storeId },
    })
      .then((res) => {
        setClientSecret(res.clientSecret)
        setPaymentIntentId(res.paymentIntentId)
      })
      .catch((err) => {
        setIntentError(err.message ?? "Stripe error")
      })
  }, [items.length, storeId, totalCents, clientSecret, createPaymentIntent])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Votre panier est vide
        </h1>
        <Link
          href="/menu"
          className="mt-6 inline-flex rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Retour au menu
        </Link>
      </div>
    )
  }

  if (!stripePromise) {
    return (
      <ConfigError message="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est manquant. Voir .env.example." />
    )
  }

  if (intentError) {
    return <ConfigError message={intentError} />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au panier
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl dark:text-zinc-50">
        Paiement
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
        {clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
          >
            <CheckoutInner
              storeId={storeId as Id<"stores">}
              paymentIntentId={paymentIntentId!}
              totalAmount={summary.total}
              onSuccess={(orderId) => {
                router.push(`/order/${orderId}`)
              }}
            />
          </Elements>
        ) : (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
              />
            ))}
          </div>
        )}

        <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <CartSummary
            subtotal={summary.subtotal}
            tax={summary.tax}
            deliveryFee={summary.deliveryFee}
            total={summary.total}
            taxRate={TAX_RATE}
          />
          <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
            <Lock className="h-3 w-3" />
            Paiement securise par Stripe
          </p>
        </div>
      </div>
    </div>
  )
}

function CheckoutInner({
  storeId,
  paymentIntentId,
  totalAmount,
  onSuccess,
}: {
  storeId: Id<"stores">
  paymentIntentId: string
  totalAmount: number
  onSuccess: (orderId: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const items = useCartItems()
  const { clearCart } = useCart()
  const createOrder = useMutation(api.orders.create)
  const createPayment = useMutation(api.payments.create)

  const [formData, setFormData] = useState<CheckoutFormData | null>(null)
  const [formValid, setFormValid] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !formData || !formValid) return

    setSubmitting(true)

    try {
      const { error: submitError } = await elements.submit()
      if (submitError) {
        toast.error(submitError.message ?? "Erreur de validation")
        return
      }

      const { error: confirmError, paymentIntent } =
        await stripe.confirmPayment({
          elements,
          redirect: "if_required",
          confirmParams: {
            return_url: `${window.location.origin}/order/pending`,
          },
        })

      if (confirmError) {
        toast.error(confirmError.message ?? "Paiement echoue")
        return
      }

      if (paymentIntent?.status !== "succeeded") {
        toast.error("Paiement non confirme")
        return
      }

      // MVP: create order client-side after Stripe success.
      // PROD: replace with Stripe webhook → orders.create server-side.
      const orderId = await createOrder({
        storeId,
        customerInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        items: items.map((item) => ({
          productId: item.productId as Id<"products">,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          selectedOptions: item.options.map((o) => ({
            optionName: o.name,
            choiceName: o.choice,
            priceModifier: o.priceModifier,
          })),
          subtotal: item.price * item.quantity,
        })),
        type: formData.orderType,
        deliveryAddress:
          formData.orderType === "delivery"
            ? {
                street: formData.street,
                city: formData.city,
                postalCode: formData.postalCode,
                country: formData.country,
              }
            : undefined,
        notes: formData.notes || undefined,
        paymentMethod: "stripe",
      })

      await createPayment({
        storeId,
        orderId: orderId as Id<"orders">,
        amount: totalAmount,
        currency: "eur",
        provider: "stripe",
        externalId: paymentIntentId,
      })

      clearCart()
      onSuccess(orderId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <CheckoutForm
        onChange={(data, valid) => {
          setFormData(data)
          setFormValid(valid)
        }}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Carte bancaire
        </h2>
        <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <PaymentElement />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Mode test : utiliser{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">
            4242 4242 4242 4242
          </code>{" "}
          + n&apos;importe quelle date future + CVV.
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || !formValid || submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Traitement…" : `Payer ${formatPrice(totalAmount)}`}
      </button>
    </form>
  )
}

function ConfigError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 md:px-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
        <h2 className="font-semibold text-amber-900 dark:text-amber-200">
          Stripe non configure
        </h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          {message}
        </p>
      </div>
    </div>
  )
}
