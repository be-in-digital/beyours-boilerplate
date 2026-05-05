"use client"

import { useState } from "react"

export interface CheckoutFormData {
  name: string
  email: string
  phone: string
  orderType: "pickup" | "delivery"
  street: string
  city: string
  postalCode: string
  country: string
  notes: string
}

const initial: CheckoutFormData = {
  name: "",
  email: "",
  phone: "",
  orderType: "pickup",
  street: "",
  city: "",
  postalCode: "",
  country: "FR",
  notes: "",
}

/**
 * Customer info + delivery address form for guest checkout.
 *
 * Calls onValidSubmit when all required fields are filled and the
 * customer clicks the submit button. Stripe Elements is wired into
 * the same submit handler in `/checkout/page.tsx`.
 */
export function CheckoutForm({
  onChange,
}: {
  onChange: (data: CheckoutFormData, isValid: boolean) => void
}) {
  const [data, setData] = useState<CheckoutFormData>(initial)

  const update = <K extends keyof CheckoutFormData>(
    key: K,
    value: CheckoutFormData[K],
  ) => {
    const next = { ...data, [key]: value }
    setData(next)
    onChange(next, isValid(next))
  }

  return (
    <div className="space-y-6">
      <Section title="Vos coordonnees">
        <Field
          label="Nom complet *"
          value={data.name}
          onChange={(v) => update("name", v)}
          autoComplete="name"
        />
        <Field
          label="Email *"
          type="email"
          value={data.email}
          onChange={(v) => update("email", v)}
          autoComplete="email"
        />
        <Field
          label="Telephone *"
          type="tel"
          value={data.phone}
          onChange={(v) => update("phone", v)}
          autoComplete="tel"
        />
      </Section>

      <Section title="Mode de retrait">
        <div className="grid gap-2 sm:grid-cols-2">
          <RadioCard
            label="A emporter"
            description="Pret en 15 minutes"
            checked={data.orderType === "pickup"}
            onClick={() => update("orderType", "pickup")}
          />
          <RadioCard
            label="Livraison"
            description="Frais selon zone"
            checked={data.orderType === "delivery"}
            onClick={() => update("orderType", "delivery")}
          />
        </div>
      </Section>

      {data.orderType === "delivery" && (
        <Section title="Adresse de livraison">
          <Field
            label="Adresse *"
            value={data.street}
            onChange={(v) => update("street", v)}
            autoComplete="street-address"
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <Field
              label="Ville *"
              value={data.city}
              onChange={(v) => update("city", v)}
              autoComplete="address-level2"
            />
            <Field
              label="Code postal *"
              value={data.postalCode}
              onChange={(v) => update("postalCode", v)}
              autoComplete="postal-code"
            />
          </div>
        </Section>
      )}

      <Section title="Notes">
        <textarea
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Preferences, allergies, instructions de livraison..."
          rows={3}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
        />
      </Section>
    </div>
  )
}

function isValid(d: CheckoutFormData): boolean {
  if (!d.name.trim() || !d.email.trim() || !d.phone.trim()) return false
  if (d.orderType === "delivery") {
    if (!d.street.trim() || !d.city.trim() || !d.postalCode.trim()) {
      return false
    }
  }
  return true
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  )
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-50"
      />
    </label>
  )
}

function RadioCard({
  label,
  description,
  checked,
  onClick,
}: {
  label: string
  description: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-lg border p-4 text-left transition-colors " +
        (checked
          ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700")
      }
    >
      <p className="font-medium text-zinc-900 dark:text-zinc-50">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
    </button>
  )
}
