"use client"

import { MapPin, Loader2, Navigation } from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Empty,
  EmptyHeader,
  EmptyTitle,
} from "@be-in-digital/ui/components"
import {
  useStorefrontStoreSelection,
  useCartStore,
  useNearestStore,
  type StoreWithDistance,
} from "@be-in-digital/restaurant"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

function StoreOption({
  store,
  isSelected,
  onSelect,
}: {
  store: StoreWithDistance
  isSelected: boolean
  onSelect: () => void
}) {
  const isOpen = store.status === "open"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
        isSelected
          ? "bg-[#0D5C3F]/10 border border-[#0D5C3F]/20"
          : "hover:bg-zinc-50 border border-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900 truncate">
              {store.name}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                isOpen ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            />
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">
            {store.address?.street}, {store.address?.city}
          </p>
        </div>
        {store.distance != null && (
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex-shrink-0 mt-0.5">
            {formatDistance(store.distance)}
          </span>
        )}
      </div>
    </button>
  )
}

export function StoreSelectorDropdown({
  variant = "solid",
}: {
  variant?: "transparent" | "solid"
}) {
  const convexStores = useQuery(api.stores.list)
  const storeId = useStorefrontStoreSelection((s) => s.storeId)
  const setStoreId = useStorefrontStoreSelection((s) => s.setStoreId)
  const setCartStoreId = useCartStore((s) => s.setStoreId)

  const stores = convexStores ?? []
  // Distances belong in this panel, but the panel is mounted in the header of
  // every page - so asking on mount asks everywhere. A visitor who already
  // granted their position gets distances straight away; everyone else gets
  // the "Localiser" button below, and no prompt they did not ask for.
  const { storesWithDistance, isLocating, requestLocation } =
    useNearestStore(stores, { useGrantedLocation: true })

  const currentStore =
    stores.find((s: { _id: string }) => s._id === storeId) ?? null

  function handleSelectStore(store: StoreWithDistance) {
    if (storeId === store._id) return
    setStoreId(store._id)
    setCartStoreId(store._id)
  }

  // Don't render if only one store
  if (stores.length <= 1) return null

  const isTransparent = variant === "transparent"

  const tooltipLabel = currentStore?.name ?? "Choisir un restaurant"

  return (
    <Popover>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                  isTransparent
                    ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    : "bg-white border-zinc-100 shadow-sm text-[#0D5C3F] hover:bg-zinc-50"
                }`}
                aria-label={tooltipLabel}
              >
                <MapPin className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-2 rounded-2xl border border-zinc-100 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">
            Nos restaurants
          </h3>
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              className="flex items-center gap-1 text-[10px] font-bold text-[#0D5C3F] hover:text-[#0D5C3F]/70 uppercase tracking-widest transition-colors"
            >
              <Navigation className="h-3 w-3" />
              Localiser
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {storesWithDistance.map((store) => (
            <StoreOption
              key={store._id}
              store={store}
              isSelected={currentStore?._id === store._id}
              onSelect={() => handleSelectStore(store)}
            />
          ))}
        </div>

        {stores.length === 0 && (
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyTitle>Aucun restaurant disponible</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </PopoverContent>
    </Popover>
  )
}
