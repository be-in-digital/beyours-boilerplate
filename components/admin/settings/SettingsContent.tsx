"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { useState } from "react"
import { SettingsIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { LoadingState } from "@/components/admin/LoadingState"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DesignTabContent } from "./DesignTabContent"
import { LanguagesTabContent } from "./LanguagesTabContent"
import { PaymentsTabContent } from "./PaymentsTabContent"
import { KitchenSettingsTabContent } from "./KitchenSettingsTabContent"
import { DisplaySettingsTabContent } from "./DisplaySettingsTabContent"

const integrations = [
  {
    id: "uber-eats",
    name: "Uber Eats",
    description: "Synchronisez votre menu et recevez des commandes depuis Uber Eats",
    icon: "🚗",
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    description: "Synchronisez votre menu et recevez des commandes depuis Deliveroo",
    icon: "🛵",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Acceptez les paiements par carte avec Stripe",
    icon: "💳",
  },
  {
    id: "sumup",
    name: "SumUp",
    description: "Acceptez les paiements avec SumUp",
    icon: "📱",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Acceptez les paiements PayPal",
    icon: "🅿️",
  },
  {
    id: "square",
    name: "Square",
    description: "Acceptez les paiements avec Square",
    icon: "⬛",
  },
]

export function SettingsContent() {
  const storeId = useAdminStoreId()
  const store = useQuery(
    api.stores.getById,
    storeId ? { id: storeId } : "skip"
  )
  const updateStore = useMutation(api.stores.update)

  // General tab state
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  // Notifications state
  const [orderReceivedNotif, setOrderReceivedNotif] = useState(true)
  const [orderCompletedNotif, setOrderCompletedNotif] = useState(true)
  const [lowStockNotif, setLowStockNotif] = useState(true)

  // Integrations state (placeholder)
  const [integrationsEnabled, setIntegrationsEnabled] = useState<Record<string, boolean>>({})
  const [integrationKeys, setIntegrationKeys] = useState<Record<string, string>>({})

  // Initialize state when store loads
  if (store && name === "") {
    setName(store.name)
    setPhone(store.phone || "")
    setEmail(store.email || "")
  }

  const handleUpdateGeneral = async () => {
    if (!storeId) return
    try {
      await updateStore({
        id: storeId,
        name,
        phone: phone || undefined,
        email: email || undefined,
      })
      toast.success("Paramètres mis à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour des paramètres")
      console.error(error)
    }
  }

  const handleSaveNotifications = () => {
    // Placeholder - no backend connection yet
    toast.success("Préférences de notification enregistrées")
  }

  const handleToggleIntegration = (integrationId: string) => {
    setIntegrationsEnabled((prev) => ({
      ...prev,
      [integrationId]: !prev[integrationId],
    }))
    toast.success("Paramètres d'intégration mis à jour")
  }

  const handleUpdateIntegrationKey = (integrationId: string, key: string) => {
    setIntegrationKeys((prev) => ({
      ...prev,
      [integrationId]: key,
    }))
  }

  if (!storeId) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SettingsIcon className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun établissement sélectionné</EmptyTitle>
          <EmptyDescription>Veuillez sélectionner un établissement pour gérer les paramètres</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (store === undefined) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground mt-2">
          Gérez les paramètres de votre restaurant et vos intégrations
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cuisine">Cuisine</TabsTrigger>
          <TabsTrigger value="affichage">Affichage</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="langues">Langues</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nom du restaurant</Label>
              <Input
                id="storeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleUpdateGeneral}>Enregistrer les modifications</Button>
          </div>
        </TabsContent>

        <TabsContent value="cuisine" className="space-y-4">
          <KitchenSettingsTabContent />
        </TabsContent>

        <TabsContent value="affichage" className="space-y-4">
          <DisplaySettingsTabContent />
        </TabsContent>

        <TabsContent value="design" className="space-y-4">
          <DesignTabContent />
        </TabsContent>

        <TabsContent value="langues" className="space-y-4">
          <LanguagesTabContent />
        </TabsContent>

        <TabsContent value="paiements" className="space-y-4">
          <PaymentsTabContent />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="orderReceived">Commande reçue</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir une notification lors de la réception d&apos;une nouvelle commande
                </p>
              </div>
              <Switch
                id="orderReceived"
                checked={orderReceivedNotif}
                onCheckedChange={setOrderReceivedNotif}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="orderCompleted">Commande terminée</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir une notification lorsqu&apos;une commande est terminée
                </p>
              </div>
              <Switch
                id="orderCompleted"
                checked={orderCompletedNotif}
                onCheckedChange={setOrderCompletedNotif}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lowStock">Alerte stock bas</Label>
                <p className="text-sm text-muted-foreground">
                  Recevoir une notification lorsque les produits sont en rupture de stock
                </p>
              </div>
              <Switch
                id="lowStock"
                checked={lowStockNotif}
                onCheckedChange={setLowStockNotif}
              />
            </div>
            <Button onClick={handleSaveNotifications}>Enregistrer les préférences</Button>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{integration.icon}</span>
                      <CardTitle>{integration.name}</CardTitle>
                    </div>
                    <Switch
                      checked={integrationsEnabled[integration.id] || false}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                    />
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                {integrationsEnabled[integration.id] && (
                  <CardContent className="space-y-2">
                    <Label htmlFor={`${integration.id}-key`}>Clé API</Label>
                    <Input
                      id={`${integration.id}-key`}
                      type="password"
                      placeholder="Entrez votre clé API"
                      value={integrationKeys[integration.id] || ""}
                      onChange={(e) =>
                        handleUpdateIntegrationKey(integration.id, e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Note: Backend d&apos;intégration non encore connecté
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
