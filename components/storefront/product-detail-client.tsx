"use client"

import { useState } from "react"
import { Heart, Minus, Plus, ShoppingBag, Clock } from "lucide-react"
import Link from "next/link"
import {
  Badge,
  Separator,
  Label,
  Checkbox,
} from "@be-in-digital/ui/components"
import { AllergenBadge, SpiceLevelIndicator } from "@be-in-digital/ui/restaurant"
import type { Allergen } from "@be-in-digital/ui/restaurant"
import {
  useCartStore,
  formatPrice,
  calculateProductPrice,
  isProductAvailable,
} from "@be-in-digital/restaurant"
import type { ProductDoc, CartSelectedOption } from "@be-in-digital/restaurant"
import { useFavorites } from "@/lib/hooks/use-favorites"
import { useStoreStatus } from "@/lib/hooks/use-store-status"
import { toast } from "sonner"

interface ProductDetailClientProps {
  product: ProductDoc
  storeId: string
}

export function ProductDetailClient({ product, storeId }: ProductDetailClientProps) {
  const addItem = useCartStore((s: { addItem: (item: import("@be-in-digital/restaurant").CartItem) => void }) => s.addItem)
  const cartStoreId = useCartStore((s: { storeId: string | null }) => s.storeId)
  const { isFavorite, toggleFavorite } = useFavorites()
  const { isOpen } = useStoreStatus(storeId)

  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({})

  const available = isProductAvailable(product)
  const canAdd = available && isOpen

  // Build cart options from selected state
  const cartOptions: CartSelectedOption[] = []
  for (const option of product.options ?? []) {
    const selectedChoiceIds = selectedOptions[option.id] ?? []
    for (const choiceId of selectedChoiceIds) {
      const choice = option.choices.find((c) => c.id === choiceId)
      if (choice) {
        cartOptions.push({
          name: option.name,
          choice: choice.name,
          priceModifier: choice.priceModifier,
        })
      }
    }
  }

  const totalPrice = calculateProductPrice(product.price, cartOptions)

  const handleOptionToggle = (optionId: string, choiceId: string, maxSelections?: number) => {
    setSelectedOptions((prev) => {
      const current = prev[optionId] ?? []

      if (maxSelections === 1) {
        return { ...prev, [optionId]: [choiceId] }
      }

      if (current.includes(choiceId)) {
        return {
          ...prev,
          [optionId]: current.filter((id) => id !== choiceId),
        }
      }

      if (maxSelections && current.length >= maxSelections) {
        return prev
      }

      return { ...prev, [optionId]: [...current, choiceId] }
    })
  }

  const handleAddToCart = () => {
    if (!canAdd) return

    if (cartStoreId && cartStoreId !== storeId) {
      toast.error("Vous avez des articles d'un autre restaurant dans votre Box. Videz-la d'abord.")
      return
    }

    for (const option of product.options ?? []) {
      if (option.required && !(selectedOptions[option.id]?.length)) {
        toast.error(`Veuillez sélectionner : ${option.name}`)
        return
      }
    }

    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity,
      options: cartOptions,
      imageUrl: product.images?.[0],
    })

    toast.success(`${product.name} ajouté à la Box`)
  }

  return (
    <>
      {/* Image */}
      <div className="relative aspect-video w-full bg-zinc-100">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-300">
            <ShoppingBag className="h-16 w-16" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-6 left-6 flex gap-2">
          {product.isFeatured && (
            <span className="bg-white/90 backdrop-blur-md text-zinc-800 border-none py-2 px-4 rounded-xl font-bold uppercase text-[10px] shadow-sm">
              Populaire
            </span>
          )}
          {!available && (
            <span className="bg-red-500/90 backdrop-blur-md text-white border-none py-2 px-4 rounded-xl font-bold uppercase text-[10px] shadow-sm">
              Indisponible
            </span>
          )}
        </div>

        {/* Favorite */}
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={() => toggleFavorite(product._id, storeId)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110"
          >
            <Heart
              className={`h-5 w-5 ${
                isFavorite(product._id, storeId)
                  ? "fill-red-500 text-red-500"
                  : "text-zinc-400"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-10 space-y-6">
        {/* Header */}
        <div className="space-y-4 text-left">
          {/* Allergens & Tags */}
          <div className="flex items-center gap-4 flex-wrap">
            {product.allergens && product.allergens.length > 0 && (
              product.allergens.map((allergen) => (
                <AllergenBadge key={allergen} allergen={allergen as Allergen} />
              ))
            )}
            {product.spiceLevel !== undefined && product.spiceLevel > 0 && (
              <SpiceLevelIndicator level={product.spiceLevel} />
            )}
          </div>

          <h2 className="text-4xl font-black tracking-tighter text-zinc-800 uppercase italic leading-none">
            {product.name}
          </h2>

          {product.description && (
            <p className="text-zinc-500 font-medium leading-relaxed text-lg">
              {product.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-zinc-50 border border-zinc-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Options */}
        {(product.options?.length ?? 0) > 0 && (
          <div className="space-y-10">
            {product.options?.map((option) => {
              const isRadio = option.maxSelections === 1

              return (
                <div key={option.id} className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase tracking-tighter text-zinc-800 flex items-center gap-2">
                        {option.name}
                        {option.required && (
                          <span className="bg-orange-500/10 text-orange-600 border-none py-0.5 px-2 rounded-md text-[8px] font-black uppercase">
                            Requis
                          </span>
                        )}
                      </Label>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                        {isRadio
                          ? "Choisir 1"
                          : option.maxSelections
                            ? `Jusqu'à ${option.maxSelections}`
                            : "Sélectionner"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {option.choices.map((choice) => {
                      const isSelected = (selectedOptions[option.id] ?? []).includes(choice.id)

                      return (
                        <div
                          key={choice.id}
                          onClick={() => handleOptionToggle(option.id, choice.id, option.maxSelections)}
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${
                            isSelected
                              ? "bg-emerald-50 border-emerald-200"
                              : "bg-zinc-50 border-zinc-100 hover:border-emerald-100"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {isRadio ? (
                              <div
                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? "border-[#0D5C3F] bg-[#0D5C3F]"
                                    : "border-zinc-300"
                                }`}
                              >
                                {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                              </div>
                            ) : (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleOptionToggle(option.id, choice.id, option.maxSelections)}
                                className="data-[state=checked]:bg-[#0D5C3F] data-[state=checked]:border-[#0D5C3F]"
                              />
                            )}
                            <span className="font-bold text-sm text-zinc-700">
                              {choice.name}
                            </span>
                          </div>
                          <span className="font-black text-[10px] text-emerald-600">
                            {choice.priceModifier > 0
                              ? `+ ${formatPrice(choice.priceModifier)}`
                              : "Inclus"}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Separator className="bg-zinc-100" />

        {/* Footer: Price + Quantity + Add */}
        <div className="flex items-center justify-between pt-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">
              Prix total
            </span>
            <span className="text-4xl font-black text-[#0D5C3F] tracking-tighter leading-none">
              {formatPrice(totalPrice * quantity)}
            </span>
          </div>

          <div className="flex gap-4 items-center">
            {/* Quantity */}
            <div className="flex items-center bg-zinc-50 rounded-2xl p-2 border border-zinc-100 h-16">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-12 w-12 rounded-xl text-zinc-400 hover:text-[#0D5C3F] hover:bg-white transition-all flex items-center justify-center disabled:opacity-30"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="w-12 text-center font-black text-lg text-zinc-800">
                {quantity}
              </div>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="h-12 w-12 rounded-xl text-zinc-400 hover:text-[#0D5C3F] hover:bg-white transition-all flex items-center justify-center"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={!canAdd}
              className={`h-16 px-10 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all flex items-center gap-3 ${
                canAdd
                  ? "bg-[#0D5C3F] hover:bg-[#0A412D] text-white shadow-emerald-900/20"
                  : "bg-zinc-300 text-white cursor-not-allowed shadow-none"
              }`}
            >
              <ShoppingBag className="h-5 w-5" />
              {!available
                ? "Indisponible"
                : !isOpen
                  ? "Fermé"
                  : "Ajouter"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
