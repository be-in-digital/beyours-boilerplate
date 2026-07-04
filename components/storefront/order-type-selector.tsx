"use client"

import { Truck, ShoppingBag, Utensils } from "lucide-react"
import type { OrderType } from "@be-in-digital/restaurant"

interface OrderTypeSelectorProps {
  value: OrderType
  onChange: (type: OrderType) => void
  disabled?: boolean
  services?: { dineIn: boolean; takeaway: boolean; delivery: boolean } | null
}

const options: {
  type: OrderType
  label: string
  icon: typeof Truck
  serviceKey: "delivery" | "takeaway" | "dineIn"
}[] = [
  { type: "delivery", label: "Livraison", icon: Truck, serviceKey: "delivery" },
  { type: "pickup", label: "À emporter", icon: ShoppingBag, serviceKey: "takeaway" },
  { type: "dine_in", label: "Sur place", icon: Utensils, serviceKey: "dineIn" },
]

export function OrderTypeSelector({
  value,
  onChange,
  disabled,
  services,
}: OrderTypeSelectorProps) {
  const availableOptions = options.filter(
    (opt) => !services || services[opt.serviceKey]
  )

  return (
    <div
      className={`grid gap-2 ${
        availableOptions.length === 3 ? "grid-cols-3" : availableOptions.length === 2 ? "grid-cols-2" : "grid-cols-1"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {availableOptions.map((opt) => {
        const isSelected = value === opt.type
        const Icon = opt.icon

        return (
          <button
            key={opt.type}
            onClick={() => onChange(opt.type)}
            className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-center transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
