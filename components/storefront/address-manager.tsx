"use client"

import { useState } from "react"
import {
  MapPin,
  MapPinOff,
  Star,
  Trash2,
  Plus,
  Pencil,
  CheckCircle2,
} from "lucide-react"
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  Separator,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@be-in-digital/ui/components"
import { useAddressesStore, type SavedAddress } from "@/lib/stores/addresses-store"
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete"
import type { AddressValue } from "@/lib/address"
import { toast } from "sonner"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const emptyAddress: AddressValue = {
  street: "",
  city: "",
  postalCode: "",
  country: "France",
}

export function AddressManager() {
  const addresses = useAddressesStore((s: { addresses: SavedAddress[] }) => s.addresses)
  const addAddress = useAddressesStore((s: { addAddress: (addr: Omit<SavedAddress, "id" | "isDefault">) => void }) => s.addAddress)
  const updateAddress = useAddressesStore((s: { updateAddress: (id: string, addr: Omit<SavedAddress, "id" | "isDefault">) => void }) => s.updateAddress)
  const removeAddress = useAddressesStore((s: { removeAddress: (id: string) => void }) => s.removeAddress)
  const setDefault = useAddressesStore((s: { setDefault: (id: string) => void }) => s.setDefault)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addressLabel, setAddressLabel] = useState("")
  const [manualAddress, setManualAddress] = useState<AddressValue>(emptyAddress)
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

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setManualAddress(emptyAddress)
    setAddressLabel("")
    setAddressMode("search")
  }

  const handleEdit = (addr: SavedAddress) => {
    setEditingId(addr.id)
    setAddressLabel(addr.label ?? "")
    setManualAddress({
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
    })
    setAddressMode("manual")
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!manualAddress.street.trim() || !manualAddress.city.trim() || !manualAddress.postalCode.trim()) {
      toast.error("Veuillez remplir au moins la rue, la ville et le code postal")
      return
    }
    const data = {
      label: addressLabel || undefined,
      street: manualAddress.street,
      city: manualAddress.city,
      postalCode: manualAddress.postalCode,
      country: manualAddress.country || "France",
    }
    if (editingId) {
      updateAddress(editingId, data)
      resetForm()
      toast.success("Adresse modifiée")
    } else {
      addAddress(data)
      resetForm()
      toast.success("Adresse ajoutée")
    }
  }

  const handleRemove = (id: string) => {
    if (window.confirm("Supprimer cette adresse ?")) {
      removeAddress(id)
      toast.success("Adresse supprimée")
    }
  }

  return (
    <div className="space-y-6">
      {/* Address list */}
      {addresses.length === 0 && !showForm && (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>Aucune adresse enregistrée</EmptyTitle>
            <EmptyDescription>
              Ajoutez une adresse pour accélérer vos commandes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {addresses.length > 0 && (
        <div className="space-y-3">
          {addresses.map((addr: SavedAddress) => (
            <Card key={addr.id} className="rounded-2xl">
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-1 h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      {addr.label && (
                        <span className="font-medium">{addr.label}</span>
                      )}
                      {addr.isDefault && (
                        <Badge variant="secondary" className="text-[10px]">
                          Par défaut
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {addr.street}, {addr.postalCode} {addr.city}, {addr.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(addr)}
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!addr.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDefault(addr.id)}
                      title="Définir par défaut"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(addr.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add form toggle */}
      {!showForm && (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une adresse
        </Button>
      )}

      {/* Add form — same flow as checkout */}
      {showForm && (
        <div className="overflow-hidden rounded-[2.5rem] border-none bg-white p-2 shadow-xl shadow-black/[0.03]">
          <div className="p-8">
            <div className="mb-2 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <MapPin className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-800">
                {editingId ? "Modifier l\u2019adresse" : "Nouvelle adresse"}
              </h2>
            </div>
            <p className="text-sm text-zinc-400">
              Recherchez votre adresse ou saisissez-la manuellement.
            </p>
          </div>

          <div className="space-y-4 px-8 pb-8">
            {/* Label */}
            <div className="space-y-2">
              <Label className="ml-1 text-[10px] font-black uppercase tracking-widest">
                Nom (optionnel)
              </Label>
              <Input
                value={addressLabel}
                onChange={(e) => setAddressLabel(e.target.value)}
                placeholder="ex: Maison, Bureau"
                className="h-14 rounded-2xl border-transparent bg-zinc-50 px-6 text-sm font-medium transition-all focus:bg-white focus:ring-emerald-500/20"
              />
            </div>

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
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-all hover:border-zinc-300 hover:text-zinc-500"
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
                        setManualAddress(emptyAddress)
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-zinc-600"
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
                        setManualAddress(emptyAddress)
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

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!showAddressFields}
                className="h-14 flex-1 rounded-2xl bg-[#0D5C3F] font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-900/10 transition-all hover:bg-[#0A412D]"
              >
                {editingId ? "Enregistrer" : "Ajouter l\u2019adresse"}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                className="h-14 rounded-2xl border-zinc-200 px-8 font-black uppercase tracking-widest transition-all"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
