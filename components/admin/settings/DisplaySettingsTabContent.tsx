"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Store } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function DisplaySettingsForm({ store, storeId }: { store: Store; storeId: Id<"stores"> }) {
  const updateDisplayConfig = useMutation(api.stores.updateDisplayConfig)

  const [autoDismissEnabled, setAutoDismissEnabled] = useState(
    store.displayConfig?.autoDismissEnabled ?? true
  )
  const [autoDismissMinutes, setAutoDismissMinutes] = useState(
    store.displayConfig?.autoDismissMinutes ?? 15
  )

  const handleSave = async () => {
    try {
      await updateDisplayConfig({
        id: storeId,
        displayConfig: {
          autoDismissEnabled,
          autoDismissMinutes,
        },
      })
      toast.success("Configuration affichage mise a jour")
    } catch {
      toast.error("Echec de la mise a jour")
    }
  }

  const displayUrl = `${window.location.origin}/display/${storeId}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ecran salle</CardTitle>
          <CardDescription>
            Configuration de l&apos;ecran d&apos;affichage client (TV)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL de l&apos;ecran</Label>
            <div className="flex gap-2">
              <Input value={displayUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(displayUrl)
                  toast.success("URL copiee")
                }}
              >
                Copier
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ouvrez cette URL en plein ecran sur votre TV
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-dismiss des commandes pretes</Label>
              <p className="text-xs text-muted-foreground">
                Retire automatiquement les commandes pretes apres un delai
              </p>
            </div>
            <Switch
              checked={autoDismissEnabled}
              onCheckedChange={setAutoDismissEnabled}
            />
          </div>

          {autoDismissEnabled && (
            <div className="space-y-2">
              <Label>Delai (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={autoDismissMinutes}
                onChange={(e) => setAutoDismissMinutes(Number(e.target.value))}
              />
            </div>
          )}

          <Button onClick={handleSave} size="sm">Enregistrer</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function DisplaySettingsTabContent() {
  const storeId = useAdminStoreId()
  const store = useQuery(api.stores.getById, storeId ? { id: storeId } : "skip")

  if (!store || !storeId) return null

  return <DisplaySettingsForm store={store} storeId={storeId} />
}
