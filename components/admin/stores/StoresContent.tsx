"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Store } from "@/lib/admin/types"
import { toast } from "sonner"
import { useState } from "react"
import { PlusIcon, StoreIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { LoadingState } from "@/components/admin/LoadingState"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { slugify } from "@/lib/admin/formatters"
import { AddressAutocomplete, type AddressValue } from "@/components/ui/address-autocomplete"
import Link from "next/link"
import { cn } from "@/lib/utils"

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

const statusConfig = {
  open: { label: "Ouvert", color: "bg-green-500 text-white" },
  closed: { label: "Fermé", color: "bg-red-500 text-white" },
  temporarily_unavailable: { label: "Indisponible", color: "bg-orange-500 text-white" },
}

export function StoresContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [address, setAddress] = useState<AddressValue>({
    street: "",
    city: "",
    postalCode: "",
    country: "France",
  })
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const stores = useQuery(api.stores.listAll, {})
  const createStore = useMutation(api.stores.create)

  const handleCreateStore = async () => {
    if (!name || !address.street || !address.city || !address.postalCode) {
      toast.error("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      const slug = slugify(name)
      await createStore({
        name,
        slug,
        description: description || undefined,
        address: {
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          latitude: address.latitude,
          longitude: address.longitude,
        },
        phone: phone || undefined,
        email: email || undefined,
      })
      toast.success("Établissement créé avec succès")
      setIsCreateDialogOpen(false)
      // Reset form
      setName("")
      setDescription("")
      setAddress({ street: "", city: "", postalCode: "", country: "France" })
      setPhone("")
      setEmail("")
    } catch (error) {
      toast.error("Échec de la création de l'établissement")
      console.error(error)
    }
  }

  if (stores === undefined) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Établissements</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos établissements
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Créer un établissement
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-2xl"
            onPointerDownOutside={(e) => {
              const target = e.target as HTMLElement
              if (target.closest(".pac-container")) {
                e.preventDefault()
              }
            }}
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement
              if (target.closest(".pac-container")) {
                e.preventDefault()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Créer un nouvel établissement</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel établissement à votre entreprise
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l&apos;établissement *</Label>
                  <Input
                    id="name"
                    placeholder="Restaurant principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (généré automatiquement)</Label>
                  <Input
                    id="slug"
                    value={slugify(name)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Description optionnelle"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <AddressAutocomplete
                label="Adresse *"
                value={address}
                onChange={setAddress}
                apiKey={GOOGLE_MAPS_API_KEY}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    placeholder="+33 1 23 45 67 89"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <ButtonGroup>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateStore}>Créer un établissement</Button>
              </ButtonGroup>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {stores.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>Aucun établissement</EmptyTitle>
            <EmptyDescription>Créez votre premier établissement pour commencer</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: Store) => (
            <Link
              key={store._id}
              href={`/dashboard/stores/${store._id}`}
              className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  <Badge
                    className={cn(
                      "mt-2",
                      statusConfig[store.status as keyof typeof statusConfig]?.color || "bg-gray-500 text-white"
                    )}
                  >
                    {statusConfig[store.status as keyof typeof statusConfig]?.label || store.status}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{store.address.street}</p>
                <p>{store.address.city}, {store.address.postalCode}</p>
                {store.phone && <p>{store.phone}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
