"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  ArrowRight,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Truck,
  ShoppingBag,
  MapPinOff,
  CheckCircle2,
  Banknote,
  Utensils,
} from "lucide-react"
import {
  Button,
  Input,
  Label,
  Separator,
} from "@be-in-digital/ui"
import {
  resolvePaymentMethod,
  useCartStore,
  type OrderType,
  type PaymentMethodContext,
} from "@be-in-digital/restaurant"
import { isOrderTypeOffered, type StoreServices } from "@be-in-digital/convex-schema"
import {
  MAX_TABLE_NUMBER_LENGTH,
  normalizeTableNumber,
} from "@be-in-digital/core/dining"
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete"
import type { AddressValue } from "@/lib/address"
import type { SavedAddress } from "@/lib/stores/addresses-store"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const checkoutSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().optional(),
})

type CheckoutFormData = z.infer<typeof checkoutSchema>

export type PaymentMethod = "card" | "paypal" | "cash"

interface UserInfo {
  name?: string
  email?: string
  phone?: string
}

interface CheckoutFormProps {
  onSubmit: (data: {
    name: string
    email?: string
    phone?: string
    paymentMethod: PaymentMethod
    /** Set only for `dine_in`; the server rejects it on the other types. */
    tableNumber?: string
    deliveryAddress?: {
      street: string
      city: string
      postalCode: string
      country: string
      latitude?: number
      longitude?: number
    }
  }) => void
  isSubmitting: boolean
  addresses: SavedAddress[]
  isAuthenticated: boolean
  user?: UserInfo
  /**
   * Reports the delivery address as it changes. Coordinates are included when
   * known — the checkout needs them to request an Uber Direct quote before the
   * order is submitted, since the server now reads the delivery fee from that
   * quote instead of trusting a client-supplied number.
   */
  onAddressChange?: (
    address: { latitude?: number; longitude?: number } | null
  ) => void
  /**
   * The services the store actually offers, or `null` while they load.
   *
   * This form used to carry its own two-option fulfilment toggle that knew
   * nothing about them, so a cart set to `dine_in` showed "À emporter"
   * selected and one click rewrote the type to `pickup` — the customer sat at
   * a table and the kitchen was told to bag the order. The toggle is now the
   * same three types the cart offers, filtered by the same predicate the
   * server validates against.
   */
  services?: StoreServices | null
}

const fulfillmentOptions: {
  type: OrderType
  label: string
  icon: typeof Truck
}[] = [
  { type: "delivery", label: "Livraison", icon: Truck },
  { type: "pickup", label: "À emporter", icon: ShoppingBag },
  { type: "dine_in", label: "Sur place", icon: Utensils },
]

export function CheckoutForm({
  onSubmit,
  isSubmitting,
  addresses,
  isAuthenticated,
  user,
  onAddressChange,
  services,
}: CheckoutFormProps) {
  const orderType = useCartStore((s) => s.orderType)
  const setOrderType = useCartStore((s) => s.setOrderType)
  const isDelivery = orderType === "delivery"
  const isDineIn = orderType === "dine_in"

  // Nothing is offered until the services are known. `null` here means "still
  // loading", not "everything" — guessing is what put Livraison in front of a
  // restaurant that does not deliver.
  const availableFulfillment = services
    ? fulfillmentOptions.filter((opt) => isOrderTypeOffered(opt.type, services))
    : []

  const [tableNumber, setTableNumber] = useState("")
  const [tableNumberError, setTableNumberError] = useState<string | null>(null)

  const globalSettings = useQuery(api.globalSettings.get)
  const payments = globalSettings?.payments
  // Server-measured: can this deployment take a card at all? `cardProvider`
  // only declares WHICH provider; on a fresh deployment nothing is keyed and
  // every card attempt fails, so the tile must not be the default (#374).
  const cardAvailability = useQuery(api.paymentAvailability.get)

  const [selectedAddressId, setSelectedAddressId] = useState<
    string | "manual"
  >(addresses.find((a) => a.isDefault)?.id ?? "manual")
  // `null` is "the diner has not chosen": the tile they land on is decided by
  // `resolvePaymentMethod` below, from what the deployment can actually serve.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [manualAddress, setManualAddress] = useState<AddressValue>({
    street: "", city: "", postalCode: "", country: "France",
  })
  // "search" = only search bar visible, "selected" = address picked from Google, "manual" = user types manually
  const [addressMode, setAddressMode] = useState<"search" | "selected" | "manual">("search")

  const { inputRef: addressInputRef } = useGooglePlacesAutocomplete({
    apiKey: GOOGLE_MAPS_API_KEY,
    onSelect: (parsed) => {
      setManualAddress((prev) => ({
        street: parsed.street ?? prev.street,
        city: parsed.city ?? prev.city,
        postalCode: parsed.postalCode ?? prev.postalCode,
        country: parsed.country ?? prev.country,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      }))
      setAddressMode("selected")
    },
  })

  const showAddressFields = addressMode === "selected" || addressMode === "manual"

  // The diner's choice while it is servable, else the first servable tile in
  // display order — and `null` when the deployment can serve none, which
  // disables submit instead of sending a doomed attempt. One rule for the
  // default and every fallback; the old inline "reset to card" resolved to a
  // tile no card provider could honour (#374).
  const paymentContext: PaymentMethodContext = {
    cardAvailable: cardAvailability?.card,
    paypalEnabled: payments?.paypal === true,
    cashEnabled: payments?.cash === true,
    isDelivery,
    isAuthenticated,
  }
  const effectivePaymentMethod: PaymentMethod | null = resolvePaymentMethod(
    paymentMethod,
    paymentContext
  )
  const cardUnavailable = cardAvailability?.card === false

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
    },
  })

  // Update form when user session changes (e.g. after sign-in dialog)
  useEffect(() => {
    if (user?.name || user?.email) {
      reset({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
      })
    }
  }, [user?.name, user?.email, user?.phone, reset])

  // Notify parent when the delivery address changes
  useEffect(() => {
    if (!onAddressChange || !isDelivery) {
      onAddressChange?.(null)
      return
    }
    if (selectedAddressId !== "manual") {
      const saved = addresses.find((a) => a.id === selectedAddressId)
      // Saved addresses carry no coordinates today, so a percentage-mode quote
      // cannot be requested for them — the summary says so rather than failing
      // at submit time.
      onAddressChange(saved ? {} : null)
    } else {
      const hasManual = !!(manualAddress.street.trim() && manualAddress.city.trim() && manualAddress.postalCode.trim())
      onAddressChange(
        hasManual
          ? {
              latitude: manualAddress.latitude,
              longitude: manualAddress.longitude,
            }
          : null
      )
    }
  }, [isDelivery, selectedAddressId, manualAddress, addresses, onAddressChange])

  const handleFormSubmit = (data: CheckoutFormData) => {
    let deliveryAddress:
      | {
          street: string
          city: string
          postalCode: string
          country: string
          latitude?: number
          longitude?: number
        }
      | undefined

    if (isDelivery) {
      if (selectedAddressId !== "manual") {
        const saved = addresses.find((a) => a.id === selectedAddressId)
        if (saved) {
          deliveryAddress = {
            street: saved.street,
            city: saved.city,
            postalCode: saved.postalCode,
            country: saved.country,
            latitude: saved.latitude,
            longitude: saved.longitude,
          }
        }
      } else {
        if (!manualAddress.street.trim() || !manualAddress.city.trim() || !manualAddress.postalCode.trim()) {
          return
        }
        deliveryAddress = {
          street: manualAddress.street,
          city: manualAddress.city,
          postalCode: manualAddress.postalCode,
          country: manualAddress.country || "France",
          latitude: manualAddress.latitude,
          longitude: manualAddress.longitude,
        }
      }
    }

    // The table is required here and optional on the server. The server has to
    // accept a `dine_in` order without one — Uber Eats and Deliveroo forward
    // those and they carry no table — but a diner checking out on the
    // storefront is demonstrably sitting at one, and a slip with no table is
    // the defect this field exists to close.
    let table: string | undefined
    if (isDineIn) {
      table = normalizeTableNumber(tableNumber)
      if (!table) {
        setTableNumberError("Indiquez votre numéro de table")
        return
      }
      if (table.length > MAX_TABLE_NUMBER_LENGTH) {
        setTableNumberError(
          `Numéro de table trop long (${MAX_TABLE_NUMBER_LENGTH} caractères maximum)`
        )
        return
      }
      setTableNumberError(null)
    }

    // No servable method: the button is disabled, but a submit can still race
    // the availability answer — refuse it rather than send a doomed attempt.
    if (!effectivePaymentMethod) return

    onSubmit({
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      paymentMethod: effectivePaymentMethod,
      // Sent only for dine-in. Switching the type away from `sur place` must
      // not leave a stale table on the order — the server rejects one on a
      // delivery or pickup order precisely to catch that.
      tableNumber: table,
      deliveryAddress,
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Fulfillment Method Selection */}
      <div
        className={`grid gap-4 ${
          availableFulfillment.length === 3
            ? "grid-cols-3"
            : availableFulfillment.length === 2
              ? "grid-cols-2"
              : "grid-cols-1"
        }`}
      >
        {availableFulfillment.map((opt) => {
          const Icon = opt.icon
          // Exact, not a `!== "delivery"` catch-all: that catch-all is what
          // showed "À emporter" lit up for a dine-in cart and then wrote
          // `pickup` over it on the next click.
          const isSelected = orderType === opt.type

          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => setOrderType(opt.type)}
              className={`group flex h-24 flex-col items-center justify-center gap-2 rounded-[2rem] border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary text-white shadow-xl shadow-emerald-900/10"
                  : "border-zinc-100 bg-white text-zinc-500 dark:text-zinc-400 hover:border-zinc-200"
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-colors ${
                  isSelected
                    ? "text-orange-400"
                    : "text-zinc-500 group-hover:text-zinc-700"
                }`}
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table number — dine-in only */}
      {isDineIn && (
        <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
          <div className="p-8 space-y-2">
            <Label htmlFor="tableNumber" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Numéro de table
            </Label>
            <Input
              id="tableNumber"
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value)
                if (tableNumberError) setTableNumberError(null)
              }}
              maxLength={MAX_TABLE_NUMBER_LENGTH}
              placeholder="12, A3, Terrasse 4…"
              aria-invalid={tableNumberError ? true : undefined}
              aria-describedby={
                tableNumberError ? "tableNumber-error" : "tableNumber-hint"
              }
            />
            {tableNumberError ? (
              <p id="tableNumber-error" role="alert" className="text-sm text-destructive">
                {tableNumberError}
              </p>
            ) : (
              <p id="tableNumber-hint" className="text-sm text-muted-foreground">
                Le numéro figure sur votre table. Il est imprimé sur le ticket
                de cuisine pour que votre commande vous soit apportée.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
        <div className="p-8">
          <div className="mb-2 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800">
              Contact
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Renseignez vos coordonnées pour la confirmation de commande.
          </p>
        </div>

        <div className="space-y-4 px-8 pb-8">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="ml-1 text-[10px] font-black uppercase tracking-widest"
            >
              Nom complet *
            </Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Jean Dupont"
              className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
            />
            {errors.name && (
              <p className="ml-1 text-xs font-medium text-rose-500">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="ml-1 text-[10px] font-black uppercase tracking-widest"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="jean.dupont@exemple.fr"
                className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
              />
              {errors.email && (
                <p className="ml-1 text-xs font-medium text-rose-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className="ml-1 text-[10px] font-black uppercase tracking-widest"
              >
                Téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+33 6 00 00 00 00"
                className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Address - Conditional */}
      {isDelivery && (
        <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
          <div className="p-8">
            <div className="mb-2 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800">
                Livraison
              </h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Où souhaitez-vous recevoir votre commande ?
            </p>
          </div>

          <div className="space-y-4 px-8 pb-8">
            {/* Saved addresses */}
            {addresses.length > 0 && (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-sm transition-all ${
                      selectedAddressId === addr.id
                        ? "border-emerald-500 bg-emerald-50/30"
                        : "border-zinc-100 hover:border-zinc-200"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selectedAddressId === addr.id
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-zinc-300"
                      }`}
                    >
                      {selectedAddressId === addr.id && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      {addr.label && (
                        <span className="font-bold">{addr.label} — </span>
                      )}
                      <span className="font-medium text-zinc-600">
                        {addr.street}, {addr.postalCode} {addr.city}
                      </span>
                    </div>
                    {selectedAddressId === addr.id && (
                      <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-500" />
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedAddressId("manual")}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left text-sm transition-all ${
                    selectedAddressId === "manual"
                      ? "border-emerald-500 bg-emerald-50/30"
                      : "border-zinc-100 hover:border-zinc-200"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selectedAddressId === "manual"
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-zinc-300"
                    }`}
                  >
                    {selectedAddressId === "manual" && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="font-bold text-zinc-600">
                    Nouvelle adresse
                  </span>
                </button>
              </div>
            )}

            {/* Address autocomplete */}
            {selectedAddressId === "manual" && (
              <div className="space-y-4">
                {addresses.length > 0 && <Separator />}

                {/* Search with Google Places */}
                <div className="space-y-2">
                  <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                    Rechercher une adresse
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <input
                      ref={addressInputRef}
                      type="text"
                      placeholder="Ex : 12 rue de la Paix, Paris..."
                      className="storefront-pac-input h-14 w-full rounded-2xl border-2 border-zinc-100 bg-zinc-50 pl-12 pr-6 text-sm font-medium transition-all placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {/* "Can't find my address" fallback */}
                {addressMode === "search" && (
                  <button
                    type="button"
                    onClick={() => setAddressMode("manual")}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 transition-all hover:border-zinc-300 hover:text-zinc-500"
                  >
                    <MapPinOff className="h-3.5 w-3.5" />
                    Je ne trouve pas mon adresse
                  </button>
                )}

                {/* Detail fields — shown after Google select or manual mode */}
                {showAddressFields && (
                  <div className="space-y-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-5">
                    {addressMode === "selected" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            Adresse sélectionnée
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMode("search")
                            setManualAddress({ street: "", city: "", postalCode: "", country: "France" })
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 transition-colors hover:text-zinc-600"
                        >
                          Modifier
                        </button>
                      </div>
                    )}
                    {addressMode === "manual" && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                          Saisie manuelle
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAddressMode("search")
                            setManualAddress({ street: "", city: "", postalCode: "", country: "France" })
                          }}
                          className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 transition-colors hover:text-emerald-700"
                        >
                          Revenir à la recherche
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                        Adresse *
                      </Label>
                      <Input
                        value={manualAddress.street}
                        onChange={(e) => setManualAddress((p) => ({ ...p, street: e.target.value }))}
                        placeholder="123 rue de la Paix"
                        readOnly={addressMode === "selected"}
                        className="h-14 rounded-2xl border-transparent bg-white px-6 text-sm font-medium transition-all focus:ring-emerald-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                          Ville *
                        </Label>
                        <Input
                          value={manualAddress.city}
                          onChange={(e) => setManualAddress((p) => ({ ...p, city: e.target.value }))}
                          placeholder="Paris"
                          readOnly={addressMode === "selected"}
                          className="h-14 rounded-2xl border-transparent bg-white px-6 text-sm font-medium transition-all focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                          Code postal *
                        </Label>
                        <Input
                          value={manualAddress.postalCode}
                          onChange={(e) => setManualAddress((p) => ({ ...p, postalCode: e.target.value }))}
                          placeholder="75001"
                          readOnly={addressMode === "selected"}
                          className="h-14 rounded-2xl border-transparent bg-white px-6 text-sm font-medium transition-all focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                        Pays
                      </Label>
                      <Input
                        value={manualAddress.country}
                        onChange={(e) => setManualAddress((p) => ({ ...p, country: e.target.value }))}
                        readOnly={addressMode === "selected"}
                        className="h-14 rounded-2xl border-transparent bg-white px-6 text-sm font-medium transition-all focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment section + Submit */}
      <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
        <div className="p-8">
          <div className="mb-2 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800">
              Paiement
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Choisissez votre moyen de paiement préféré.
          </p>
        </div>

        <div className="px-8 pb-4">
          <div className="grid grid-cols-1 gap-3">
            {/* Card — shown always, selectable only when the deployment can
                actually charge one. Pre-selecting a dead card tile is what
                sent every fresh deployment's first order into #374. */}
            <button
              type="button"
              onClick={() => !cardUnavailable && setPaymentMethod("card")}
              disabled={cardUnavailable}
              className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                cardUnavailable
                  ? "border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed"
                  : effectivePaymentMethod === "card"
                    ? "border-emerald-500 bg-emerald-50/30"
                    : "border-zinc-100 hover:border-zinc-200"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                <CreditCard className={`h-6 w-6 ${cardUnavailable ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-600"}`} />
              </div>
              <div>
                <p className={`font-bold ${cardUnavailable ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-800"}`}>Carte bancaire</p>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {cardUnavailable
                    ? "Indisponible pour le moment"
                    : payments?.cardProvider === "sumup" ? "SumUp" : "Visa, Master, Amex"}
                </p>
              </div>
              {effectivePaymentMethod === "card" && !cardUnavailable && (
                <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
              )}
            </button>

            {/* PayPal — if enabled */}
            {payments?.paypal && (
              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  effectivePaymentMethod === "paypal"
                    ? "border-emerald-500 bg-emerald-50/30"
                    : "border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <span className="text-lg font-black text-blue-600">P</span>
                </div>
                <div>
                  <p className="font-bold text-zinc-800">PayPal</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Paiement sécurisé
                  </p>
                </div>
                {effectivePaymentMethod === "paypal" && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                )}
              </button>
            )}

            {/* Cash — if enabled AND order is not delivery */}
            {payments?.cash && !isDelivery && (
              <button
                type="button"
                onClick={() => isAuthenticated && setPaymentMethod("cash")}
                disabled={!isAuthenticated}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                  !isAuthenticated
                    ? "border-zinc-100 bg-zinc-50 opacity-60 cursor-not-allowed"
                    : effectivePaymentMethod === "cash"
                      ? "border-emerald-500 bg-emerald-50/30"
                      : "border-zinc-100 hover:border-zinc-200"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isAuthenticated ? "bg-emerald-50" : "bg-zinc-100"}`}>
                  <Banknote className={`h-6 w-6 ${isAuthenticated ? "text-emerald-600" : "text-zinc-500 dark:text-zinc-400"}`} />
                </div>
                <div>
                  <p className={`font-bold ${isAuthenticated ? "text-zinc-800" : "text-zinc-500 dark:text-zinc-400"}`}>Espèces</p>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {isAuthenticated ? "Paiement au retrait" : "Connectez-vous pour payer en espèces"}
                  </p>
                </div>
                {effectivePaymentMethod === "cash" && isAuthenticated && (
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
                )}
              </button>
            )}
          </div>
          <p className="mt-3 text-[10px] font-medium italic text-zinc-500 dark:text-zinc-400">
            Le paiement sera traité de manière sécurisée au moment de la validation.
          </p>
        </div>

        <div className="px-8 pb-8 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !effectivePaymentMethod}
            className="group h-16 w-full rounded-2xl bg-primary text-lg font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/10 transition-all hover:bg-primary-hover"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Traitement en cours...
              </span>
            ) : (
              <>
                {effectivePaymentMethod === "card"
                  ? "Payer par carte"
                  : effectivePaymentMethod === "paypal"
                    ? "Payer avec PayPal"
                    : effectivePaymentMethod === "cash"
                      ? "Confirmer la commande"
                      : "Choisissez un moyen de paiement"}
                <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}
