"use client"

import { useRef, useEffect, useId } from "react"
import { MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete"
import type { AddressValue } from "@/lib/address"

export type { AddressValue }

export interface AddressAutocompleteProps {
  value: AddressValue
  onChange: (value: AddressValue) => void
  apiKey: string
  countries?: string[]
  disabled?: boolean
  error?: string
  label?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  apiKey,
  countries = ["fr"],
  disabled = false,
  error,
  label,
}: AddressAutocompleteProps) {
  // The component can appear more than once on a page (billing and delivery
  // addresses), so the ids that tie each label to its field have to be unique
  // per instance rather than hard-coded.
  const fieldId = useId()

  // Keep a ref to always have the latest value in the callback,
  // avoiding stale closure issues with Google's async event
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const { inputRef } = useGooglePlacesAutocomplete({
    apiKey,
    countries,
    onSelect: (parsed) => {
      const current = valueRef.current
      onChangeRef.current({
        street: parsed.street ?? current.street,
        city: parsed.city ?? current.city,
        postalCode: parsed.postalCode ?? current.postalCode,
        country: parsed.country ?? current.country,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      })
    },
  })

  const fieldClassName = cn(
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    error && "border-destructive focus-visible:ring-destructive"
  )

  return (
    <div className="w-full space-y-3">
      {/* Heads the group, not one field, so it labels nothing on its own. */}
      {label && (
        <p className="text-sm font-medium leading-none">{label}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Street field IS the autocomplete field */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${fieldId}-street`}>Rue</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              id={`${fieldId}-street`}
              type="text"
              className={cn(fieldClassName, "pl-10")}
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder="2 rue de la Paix"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${fieldId}-city`}>Ville</label>
          <input
            id={`${fieldId}-city`}
            type="text"
            className={fieldClassName}
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder="Paris"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${fieldId}-postal-code`}>Code postal</label>
          <input
            id={`${fieldId}-postal-code`}
            type="text"
            className={fieldClassName}
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            placeholder="75001"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`${fieldId}-country`}>Pays</label>
          <input
            id={`${fieldId}-country`}
            type="text"
            className={fieldClassName}
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            placeholder="France"
            disabled={disabled}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
