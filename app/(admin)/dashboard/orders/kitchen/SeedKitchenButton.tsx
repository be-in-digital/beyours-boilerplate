"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Plus, Trash2, Loader2 } from "lucide-react"

export function SeedKitchenButton() {
  const storeId = useAdminStoreId()
  const seedMutation = useMutation(api.seedKitchenOrders.seedKitchenOrders)
  const cleanMutation = useMutation(api.seedKitchenOrders.cleanKitchenSeed)
  const [isSeeding, setIsSeeding] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)

  if (!storeId) return null

  const handleSeed = async () => {
    setIsSeeding(true)
    try {
      const result = await seedMutation({ storeId })
      toast.success(result.message)
    } catch (err) {
      toast.error(`Erreur: ${String(err)}`)
    } finally {
      setIsSeeding(false)
    }
  }

  const handleClean = async () => {
    setIsCleaning(true)
    try {
      const result = await cleanMutation({ storeId })
      toast.success(`${result.deletedTickets} tickets et ${result.deletedOrders} commandes supprimées`)
    } catch (err) {
      toast.error(`Erreur: ${String(err)}`)
    } finally {
      setIsCleaning(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSeed}
        disabled={isSeeding || isCleaning}
      >
        {isSeeding ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        Créer commandes test
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClean}
        disabled={isSeeding || isCleaning}
      >
        {isCleaning ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        Nettoyer test
      </Button>
    </div>
  )
}
