"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { useState, use } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { LoadingState } from "@/components/admin/LoadingState"
import { AddressAutocomplete, type AddressValue } from "@/components/ui/address-autocomplete"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const dayNames: Record<number, string> = {
  0: "Dimanche",
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
}

export function StoreDetailContent({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params)
  const store = useQuery(api.stores.getById, { id: storeId as Id<"stores"> })
  const updateStore = useMutation(api.stores.update)
  const updateAddressMutation = useMutation(api.stores.updateAddress)
  const updateHours = useMutation(api.stores.updateHours)
  const updateOverrides = useMutation(api.stores.updateOverrides)

  // General tab state
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"open" | "draft" | "closed" | "temporarily_unavailable">("open")

  // Address tab state
  const [address, setAddress] = useState<AddressValue>({
    street: "",
    city: "",
    postalCode: "",
    country: "France",
  })

  // Hours tab state
  const [hours, setHours] = useState<Array<{ day: number; open: string; close: string; isClosed: boolean }>>([])

  // Settings override state (simplified - full version in admin package)
  const [deliveryEnabled, setDeliveryEnabled] = useState(true)
  const [pickupEnabled, setPickupEnabled] = useState(true)
  const [dineInEnabled, setDineInEnabled] = useState(true)

  // Initialize state when store loads
  if (store && name === "") {
    setName(store.name)
    setSlug(store.slug)
    setDescription(store.description || "")
    setPhone(store.phone || "")
    setEmail(store.email || "")
    setStatus(store.status as "open" | "draft" | "closed" | "temporarily_unavailable")

    if (store.address) {
      setAddress({
        street: store.address.street || "",
        city: store.address.city || "",
        postalCode: store.address.postalCode || "",
        country: store.address.country || "France",
        latitude: store.address.latitude,
        longitude: store.address.longitude,
      })
    }

    if (store.hours) {
      setHours(store.hours)
    } else {
      // Initialize default hours
      setHours([0, 1, 2, 3, 4, 5, 6].map(day => ({ day, open: "09:00", close: "22:00", isClosed: false })))
    }

    // Overrides are now managed via the admin package StoreDetailPage
    const overrides = store.overrides as { services?: { dineIn?: boolean; takeaway?: boolean; delivery?: boolean } } | undefined
    if (overrides?.services) {
      setDeliveryEnabled(overrides.services.delivery ?? true)
      setPickupEnabled(overrides.services.takeaway ?? true)
      setDineInEnabled(overrides.services.dineIn ?? true)
    }
  }

  const handleUpdateGeneral = async () => {
    try {
      await updateStore({
        id: storeId as Id<"stores">,
        name,
        slug,
        description: description || undefined,
        phone: phone || undefined,
        email: email || undefined,
        status,
      })
      toast.success("Établissement mis à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour de l'établissement")
      console.error(error)
    }
  }

  const handleUpdateAddress = async () => {
    try {
      await updateAddressMutation({
        id: storeId as Id<"stores">,
        address: {
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          latitude: address.latitude,
          longitude: address.longitude,
        },
      })
      toast.success("Adresse mise à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour de l'adresse")
      console.error(error)
    }
  }

  const handleUpdateHours = async () => {
    try {
      await updateHours({
        id: storeId as Id<"stores">,
        hours,
      })
      toast.success("Horaires mis à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour des horaires")
      console.error(error)
    }
  }

  const handleUpdateSettings = async () => {
    try {
      await updateOverrides({
        id: storeId as Id<"stores">,
        overrides: {
          services: {
            dineIn: dineInEnabled,
            takeaway: pickupEnabled,
            delivery: deliveryEnabled,
            clickAndCollect: true,
          },
        },
      })
      toast.success("Paramètres mis à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour des paramètres")
      console.error(error)
    }
  }

  if (!store) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{store.name}</h1>
        <p className="text-muted-foreground mt-2">Gérez les détails et paramètres de l&apos;établissement</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="address">Adresse</TabsTrigger>
          <TabsTrigger value="hours">Horaires</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;établissement</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "open" | "draft" | "closed" | "temporarily_unavailable")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                  <SelectItem value="temporarily_unavailable">Temporairement indisponible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateGeneral}>Enregistrer</Button>
          </div>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <AddressAutocomplete
              label="Adresse de l&apos;établissement"
              value={address}
              onChange={setAddress}
              apiKey={GOOGLE_MAPS_API_KEY}
            />
            <Button onClick={handleUpdateAddress}>Enregistrer l&apos;adresse</Button>
          </div>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            {hours.map((dayHours, index) => (
              <div key={dayHours.day} className="grid grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>{dayNames[dayHours.day] || dayHours.day}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`open-${dayHours.day}`}>Ouverture</Label>
                  <Input
                    id={`open-${dayHours.day}`}
                    type="time"
                    value={dayHours.open}
                    onChange={(e) => {
                      const newHours = [...hours]
                      const h = newHours[index]
                      if (h) h.open = e.target.value
                      setHours(newHours)
                    }}
                    disabled={dayHours.isClosed}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`close-${dayHours.day}`}>Fermeture</Label>
                  <Input
                    id={`close-${dayHours.day}`}
                    type="time"
                    value={dayHours.close}
                    onChange={(e) => {
                      const newHours = [...hours]
                      const h = newHours[index]
                      if (h) h.close = e.target.value
                      setHours(newHours)
                    }}
                    disabled={dayHours.isClosed}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`closed-${dayHours.day}`}
                    checked={dayHours.isClosed}
                    onCheckedChange={(checked) => {
                      const newHours = [...hours]
                      const h = newHours[index]
                      if (h) h.isClosed = checked
                      setHours(newHours)
                    }}
                  />
                  <Label htmlFor={`closed-${dayHours.day}`}>Fermé</Label>
                </div>
              </div>
            ))}
            <Button onClick={handleUpdateHours}>Enregistrer les horaires</Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="deliveryEnabled">Livraison activée</Label>
                <Switch id="deliveryEnabled" checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pickupEnabled">Click & Collect activé</Label>
                <Switch id="pickupEnabled" checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="dineInEnabled">Sur place activé</Label>
                <Switch id="dineInEnabled" checked={dineInEnabled} onCheckedChange={setDineInEnabled} />
              </div>
            </div>
            <Button onClick={handleUpdateSettings}>Enregistrer les paramètres</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
