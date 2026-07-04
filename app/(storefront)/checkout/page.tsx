"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useMutation, useQuery, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@be-in-digital/ui/components"
import { useCartStore, formatPrice } from "@be-in-digital/restaurant"
import { authClient } from "@/lib/auth-client"
import { useStoreId } from "@/lib/hooks/use-store-id"
import { useStoreStatus } from "@/lib/hooks/use-store-status"
import { useAddressesStore } from "@/lib/stores/addresses-store"
import { CheckoutForm } from "@/components/storefront/checkout-form"
import { OrderSummary } from "@/components/storefront/order-summary"
import { SignInDialog } from "@/components/storefront/sign-in-dialog"
import { toast } from "sonner"

interface AppliedPromo {
  id: string
  code: string
  name: string
  discountAmount: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const { storeId } = useStoreId()
  const { isOpen } = useStoreStatus(storeId)
  const { data: session } = authClient.useSession()

  const items = useCartStore((s) => s.items)
  const orderType = useCartStore((s) => s.orderType)
  const clearCart = useCartStore((s) => s.clearCart)
  const getSubtotal = useCartStore((s) => s.getSubtotal)
  const addresses = useAddressesStore(
    (s: { addresses: import("@/lib/stores/addresses-store").SavedAddress[] }) =>
      s.addresses
  )

  const createOrder = useMutation(api.orders.create)
  const createStripeSession = useAction(api.stripe.createCheckoutSession)
  const createSumUpCheckout = useAction(api.sumup.createCheckout)
  const createPayPalOrder = useAction(api.paypal.createPayPalOrder)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [lastOrderId, setLastOrderId] = useState<string | null>(null)
  const [formEmail, setFormEmail] = useState("")

  // Delivery fee state
  const [hasDeliveryAddress, setHasDeliveryAddress] = useState(false)
  const globalSettings = useQuery(api.globalSettings.get)

  // Promo state
  const [promoCode, setPromoCode] = useState("")
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)
  const [promoError, setPromoError] = useState("")
  const [promoLoading, setPromoLoading] = useState(false)

  // Reactive query for promo lookup
  const promoResult = useQuery(
    api.promotions.getByCouponCode,
    storeId && promoCode
      ? { storeId: storeId as Id<"stores">, couponCode: promoCode }
      : "skip"
  )

  // Process promo result when it arrives
  useEffect(() => {
    if (!promoLoading || !promoCode) return
    // Still loading from Convex
    if (promoResult === undefined) return

    setPromoLoading(false)

    if (!promoResult) {
      setPromoError("Code promo invalide ou introuvable.")
      setPromoCode("")
      return
    }

    const now = Date.now()
    const promo = promoResult

    // Validate
    if (!promo.isActive) {
      setPromoError("Ce code promo n'est plus actif.")
      setPromoCode("")
      return
    }
    if (now < promo.startDate || now > promo.endDate) {
      setPromoError("Ce code promo a expiré ou n'est pas encore valide.")
      setPromoCode("")
      return
    }
    if (promo.maxTotalUsage && promo.usageCount >= promo.maxTotalUsage) {
      setPromoError("Ce code promo a atteint sa limite d'utilisation.")
      setPromoCode("")
      return
    }

    const subtotal = getSubtotal()
    if (promo.minimumOrderAmount && subtotal < promo.minimumOrderAmount) {
      setPromoError(`Commande minimum de ${formatPrice(promo.minimumOrderAmount)} requise.`)
      setPromoCode("")
      return
    }

    // Calculate discount
    let discountAmount = 0
    if (promo.discountType === "percentage" && promo.discountValue) {
      discountAmount = Math.round(subtotal * promo.discountValue / 100)
      if (promo.maxDiscountAmount && discountAmount > promo.maxDiscountAmount) {
        discountAmount = promo.maxDiscountAmount
      }
    } else if (promo.discountType === "fixed_amount" && promo.discountValue) {
      discountAmount = promo.discountValue
    } else if (promo.discountType === "free_delivery") {
      // Handled server-side during order creation
      discountAmount = 0
    }

    if (discountAmount <= 0 && promo.discountType !== "free_delivery") {
      setPromoError("Ce code promo ne s'applique pas à votre commande.")
      setPromoCode("")
      return
    }

    setPromoError("")
    setAppliedPromo({
      id: promo._id,
      code: promo.couponCode ?? promoCode.toUpperCase(),
      name: promo.name,
      discountAmount,
    })
  }, [promoResult, promoLoading, promoCode, getSubtotal])

  // Calculate estimated delivery fee
  const estimatedDeliveryFee = (() => {
    if (orderType !== "delivery") return undefined // not delivery
    if (!hasDeliveryAddress) return null // needs address
    if (globalSettings === undefined) return null // still loading
    const deliveryConfig = globalSettings?.delivery
    if (!deliveryConfig) return null // no config → calculated server-side

    const subtotal = getSubtotal()
    const freeAbove = deliveryConfig.freeAbove
    if (freeAbove && subtotal >= freeAbove) return 0

    const feeMode = deliveryConfig.feeMode ?? "fixed"
    if (feeMode === "fixed") {
      const fee = deliveryConfig.fee
      if (fee === undefined || fee === null) return null // no fee configured
      return fee
    }

    // percentage mode depends on Uber Direct estimate — can't calculate client-side
    return null
  })()

  const handleAddressChange = useCallback((hasAddress: boolean) => {
    setHasDeliveryAddress(hasAddress)
  }, [])

  const handleApplyPromo = useCallback((code: string) => {
    setPromoError("")
    setPromoCode(code.toUpperCase())
    setPromoLoading(true)
  }, [])

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null)
    setPromoCode("")
    setPromoError("")
  }, [])

  // Guards
  useEffect(() => {
    if (items.length === 0 && !isSuccess) {
      router.replace("/cart")
    }
  }, [items.length, router, isSuccess])

  useEffect(() => {
    if (storeId === null && items.length > 0) {
      router.replace("/store-selector")
    }
  }, [storeId, items.length, router])

  // Success screen
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 pb-20 pt-32">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h1 className="mb-4 text-4xl font-black uppercase italic tracking-tighter text-zinc-800">
            Commande {" "}
            <span className="not-italic text-orange-500">Confirmée</span>
          </h1>

          <div className="mb-6">
            <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-black uppercase tracking-widest leading-none text-zinc-500">
              Commande #{lastOrderId?.slice(-6).toUpperCase()}
            </span>
          </div>

          <p className="mb-8 text-lg leading-relaxed text-zinc-500">
            Votre commande a bien été prise en compte. Vous recevrez une
            confirmation
            {formEmail && (
              <>
                {" "}
                à{" "}
                <span className="font-bold text-zinc-800">{formEmail}</span>
              </>
            )}
            .
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/menu">
              <Button className="h-14 rounded-2xl bg-[#0D5C3F] px-8 font-black uppercase tracking-widest text-white transition-all hover:bg-[#0A412D]">
                Retour au menu
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="h-14 rounded-2xl border-zinc-200 px-8 font-black uppercase tracking-widest transition-all"
              >
                Page d&apos;accueil
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0 || !storeId) return null

  const cardProvider = globalSettings?.payments?.cardProvider ?? "stripe"

  const handleSubmit = async (data: {
    name: string
    email?: string
    phone?: string
    paymentMethod: "card" | "paypal" | "cash"
    deliveryAddress?: {
      street: string
      city: string
      postalCode: string
      country: string
    }
  }) => {
    if (!isOpen) {
      toast.error("Le restaurant est actuellement fermé.")
      return
    }

    setIsSubmitting(true)
    setFormEmail(data.email ?? "")

    try {
      // 1. Create order with paymentStatus "pending"
      const orderId = await createOrder({
        storeId: storeId as Id<"stores">,
        customerId: session?.user?.id,
        customerInfo: {
          name: data.name,
          email: data.email,
          phone: data.phone,
        },
        items: items.map((item) => ({
          productId: item.productId as Id<"products">,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          selectedOptions: item.options.map((opt) => ({
            optionName: opt.name,
            choiceName: opt.choice,
            priceModifier: opt.priceModifier,
          })),
          subtotal:
            (item.price +
              item.options.reduce((s, o) => s + o.priceModifier, 0)) *
            item.quantity,
        })),
        type: orderType,
        paymentMethod: data.paymentMethod,
        promotionId: appliedPromo
          ? (appliedPromo.id as Id<"promotions">)
          : undefined,
        discountAmount: appliedPromo?.discountAmount ?? undefined,
        deliveryAddress:
          orderType === "delivery" ? data.deliveryAddress : undefined,
      })

      const origin = window.location.origin

      // 2. Route based on payment method
      if (data.paymentMethod === "cash") {
        // Cash: immediate confirmation
        setLastOrderId(orderId)
        clearCart()
        setIsSuccess(true)
        toast.success("Commande confirmée !")

      } else if (data.paymentMethod === "card") {
        if (cardProvider === "sumup") {
          // SumUp: create checkout → redirect to local widget page
          const result = await createSumUpCheckout({
            orderId: orderId as Id<"orders">,
            redirectUrl: `${origin}/checkout/success?orderId=${orderId}`,
          })
          window.location.href = `/checkout/pay?orderId=${orderId}&checkoutId=${result.checkoutId}`
        } else {
          // Stripe: create checkout session → redirect to Stripe hosted page
          const result = await createStripeSession({
            orderId: orderId as Id<"orders">,
            successUrl: `${origin}/checkout/success?orderId=${orderId}`,
            cancelUrl: `${origin}/checkout/cancel?orderId=${orderId}`,
          })
          if (result.sessionUrl) {
            window.location.href = result.sessionUrl
          } else {
            throw new Error("Impossible de créer la session de paiement.")
          }
        }

      } else if (data.paymentMethod === "paypal") {
        // PayPal: create order → redirect to PayPal approval
        const result = await createPayPalOrder({
          orderId: orderId as Id<"orders">,
          returnUrl: `${origin}/checkout/success?orderId=${orderId}`,
          cancelUrl: `${origin}/checkout/cancel?orderId=${orderId}`,
        })
        if (result.approvalUrl) {
          window.location.href = result.approvalUrl
        } else {
          throw new Error("Impossible de créer la commande PayPal.")
        }
      }

    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la commande. Veuillez réessayer."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 pb-20 pt-32">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/cart"
            className="group mb-4 inline-flex items-center text-sm font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-[#0D5C3F]"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Retour à la Box
          </Link>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-zinc-800">
              Finaliser{" "}
              <span className="not-italic text-orange-500">Commande</span>
            </h1>

            {!session && (
              <SignInDialog />
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <CheckoutForm
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              addresses={addresses}
              isAuthenticated={!!session?.user}
              user={session?.user ? {
                name: session.user.name ?? undefined,
                email: session.user.email ?? undefined,
              } : undefined}
              onAddressChange={handleAddressChange}
            />
          </div>

          {/* Right Column: Order Summary */}
          <div className="relative lg:col-span-5">
            <div className="sticky top-32 space-y-6">
              <OrderSummary
                appliedPromo={appliedPromo}
                promoError={promoError}
                promoLoading={promoLoading}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                deliveryFee={estimatedDeliveryFee}
                hasDeliveryAddress={hasDeliveryAddress}
              />

              {/* Security badge */}
              <div className="flex items-center gap-4 rounded-[2rem] border border-emerald-100 bg-emerald-50 p-8">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-emerald-950">
                    Paiement 100% Sécurisé
                  </p>
                  <p className="text-xs leading-tight text-emerald-900/60">
                    Vos informations de paiement sont cryptées et ne sont jamais
                    stockées sur nos serveurs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
