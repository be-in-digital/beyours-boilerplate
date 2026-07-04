"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Store, StoreIntegration } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type OrderMode = "auto_accept" | "auto_reject" | "manual"
type OrderConfirmation = "auto" | "manual"
type PrintProvider = "browser" | "star_cloud" | "epson_cloud" | "sunmi_cloud"
type PaperSize = "80mm" | "58mm"
type PrintTrigger = "confirmed" | "ready" | "reprint"

interface SoundChannel {
  enabled: boolean
  volume: number
}

function KitchenSettingsForm({
  store,
  storeId,
  enabledIntegrations,
}: {
  store: Store
  storeId: Id<"stores">
  enabledIntegrations: StoreIntegration[]
}) {
  const updateOrderConfirmation = useMutation(api.stores.updateOrderConfirmation)
  const updateStoreOrderMode = useMutation(api.stores.updateOrderMode)
  const updateIntegrationOrderMode = useMutation(api.storeIntegrations.updateOrderMode)
  const updatePrintConfig = useMutation(api.stores.updatePrintConfig)
  const updateSoundConfig = useMutation(api.stores.updateSoundConfig)

  // Order confirmation — initialized from props
  const [orderConf, setOrderConf] = useState<OrderConfirmation>(
    store.orderConfirmation ?? "manual"
  )

  // Print config — initialized from props
  const [printEnabled, setPrintEnabled] = useState(store.printConfig?.enabled ?? false)
  const [printProvider, setPrintProvider] = useState<PrintProvider>(store.printConfig?.provider ?? "browser")
  const [paperSize, setPaperSize] = useState<PaperSize>(store.printConfig?.paperSize ?? "80mm")
  const [triggers, setTriggers] = useState<Set<PrintTrigger>>(
    new Set(store.printConfig?.triggers ?? ["confirmed", "reprint"])
  )

  // Sound config — initialized from props
  const [newTicketSound, setNewTicketSound] = useState<SoundChannel>(
    store.soundConfig?.newTicket ?? { enabled: true, volume: 80 }
  )
  const [overdueSound, setOverdueSound] = useState<SoundChannel>(
    store.soundConfig?.overdue ?? { enabled: true, volume: 100 }
  )
  const [printerOfflineSound, setPrinterOfflineSound] = useState<SoundChannel>(
    store.soundConfig?.printerOffline ?? { enabled: true, volume: 100 }
  )

  const toggleTrigger = (t: PrintTrigger) => {
    setTriggers((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  const handleGlobalOrderModeChange = async (value: string) => {
    try {
      await updateStoreOrderMode({
        id: storeId,
        orderMode: value as OrderMode,
      })
      toast.success("Mode de commandes global mis a jour")
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  const handlePlatformOrderModeChange = async (platform: "uberEats" | "deliveroo", value: string) => {
    try {
      await updateIntegrationOrderMode({
        storeId,
        platform,
        orderMode: value as OrderMode,
      })
      const labels: Record<string, string> = { uberEats: "Uber Eats", deliveroo: "Deliveroo" }
      toast.success(`Mode ${labels[platform]} mis a jour`)
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  const handleSaveOrderConf = async () => {
    try {
      await updateOrderConfirmation({ id: storeId, orderConfirmation: orderConf })
      toast.success("Mode de confirmation mis a jour")
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  const handleSavePrint = async () => {
    try {
      await updatePrintConfig({
        id: storeId,
        printConfig: {
          provider: printProvider,
          triggers: Array.from(triggers) as PrintTrigger[],
          paperSize,
          enabled: printEnabled,
        },
      })
      toast.success("Configuration d'impression mise a jour")
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  const handleSaveSound = async () => {
    try {
      await updateSoundConfig({
        id: storeId,
        soundConfig: {
          newTicket: newTicketSound,
          overdue: overdueSound,
          printerOffline: printerOfflineSound,
        },
      })
      toast.success("Configuration sonore mise a jour")
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  return (
    <div className="space-y-6">
      {/* Order mode (global + per-platform) */}
      <Card>
        <CardHeader>
          <CardTitle>Mode de commandes</CardTitle>
          <CardDescription>
            Definit comment les commandes entrantes sont traitees (toutes sources: site web, Uber Eats, Deliveroo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mode global</Label>
            <Select
              value={store.orderMode ?? "manual"}
              onValueChange={handleGlobalOrderModeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto_accept">Auto-accept (accepte automatiquement)</SelectItem>
                <SelectItem value="auto_reject">Auto-reject (refuse automatiquement)</SelectItem>
                <SelectItem value="manual">Manuel (staff decide)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              S&apos;applique a toutes les sources sauf si une plateforme a un override
            </p>
          </div>

          {enabledIntegrations.length > 0 && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-sm font-medium">Overrides par plateforme</Label>
              {enabledIntegrations.map((integration: StoreIntegration) => (
                <div key={integration._id} className="flex items-center justify-between gap-4">
                  <span className="text-sm">
                    {integration.platform === "uberEats" ? "Uber Eats" : "Deliveroo"}
                  </span>
                  <Select
                    value={integration.orderMode ?? store.orderMode ?? "manual"}
                    onValueChange={(v) => handlePlatformOrderModeChange(integration.platform, v)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto_accept">Auto-accept</SelectItem>
                      <SelectItem value="auto_reject">Auto-reject</SelectItem>
                      <SelectItem value="manual">Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order confirmation mode */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmation des commandes</CardTitle>
          <CardDescription>
            Comment les commandes sont confirmees avant d&apos;aller en cuisine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={orderConf} onValueChange={(v) => setOrderConf(v as OrderConfirmation)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manuelle (staff valide)</SelectItem>
              <SelectItem value="auto">Automatique (directement en cuisine)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSaveOrderConf} size="sm">Enregistrer</Button>
        </CardContent>
      </Card>

      {/* Print config */}
      <Card>
        <CardHeader>
          <CardTitle>Impression tickets</CardTitle>
          <CardDescription>
            Configuration de l&apos;impression automatique des tickets de cuisine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Impression activee</Label>
            <Switch checked={printEnabled} onCheckedChange={setPrintEnabled} />
          </div>

          {printEnabled && (
            <>
              <div className="space-y-2">
                <Label>Fournisseur</Label>
                <Select value={printProvider} onValueChange={(v) => setPrintProvider(v as PrintProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser">Navigateur (kiosk)</SelectItem>
                    <SelectItem value="star_cloud">Star Cloud (bientot)</SelectItem>
                    <SelectItem value="epson_cloud">Epson Cloud (bientot)</SelectItem>
                    <SelectItem value="sunmi_cloud">Sunmi Cloud (bientot)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Taille papier</Label>
                <Select value={paperSize} onValueChange={(v) => setPaperSize(v as PaperSize)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm (standard)</SelectItem>
                    <SelectItem value="58mm">58mm (compact)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Declencheurs d&apos;impression</Label>
                <div className="space-y-2">
                  {([
                    { key: "confirmed" as const, label: "A la confirmation" },
                    { key: "ready" as const, label: "Quand pret" },
                    { key: "reprint" as const, label: "Reimpression manuelle" },
                  ]).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Switch
                        checked={triggers.has(key)}
                        onCheckedChange={() => toggleTrigger(key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={handleSavePrint} size="sm">Enregistrer</Button>
        </CardContent>
      </Card>

      {/* Sound config */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes sonores KDS</CardTitle>
          <CardDescription>
            Configuration des alertes sonores de l&apos;ecran cuisine
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {([
            { label: "Nouveau ticket", state: newTicketSound, setter: setNewTicketSound },
            { label: "Ticket en retard", state: overdueSound, setter: setOverdueSound },
            { label: "Imprimante hors ligne", state: printerOfflineSound, setter: setPrinterOfflineSound },
          ] as const).map(({ label, state, setter }) => (
            <div key={label} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={state.enabled}
                  onCheckedChange={(v) => setter({ ...state, enabled: v })}
                />
              </div>
              {state.enabled && (
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground w-12">Volume</span>
                  <Slider
                    value={[state.volume]}
                    onValueChange={(vals) => setter({ ...state, volume: vals[0] ?? state.volume })}
                    min={0}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono w-8 text-right">{state.volume}%</span>
                </div>
              )}
            </div>
          ))}

          <Button onClick={handleSaveSound} size="sm">Enregistrer</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function KitchenSettingsTabContent() {
  const storeId = useAdminStoreId()
  const store = useQuery(api.stores.getById, storeId ? { id: storeId } : "skip")
  const integrations = useQuery(
    api.storeIntegrations.listByStore,
    storeId ? { storeId } : "skip"
  )

  const enabledIntegrations = useMemo(() => {
    if (!integrations) return []
    return integrations.filter((i: StoreIntegration) => i.enabled)
  }, [integrations])

  if (!store || !storeId) return null

  return (
    <KitchenSettingsForm
      store={store}
      storeId={storeId}
      enabledIntegrations={enabledIntegrations}
    />
  )
}
