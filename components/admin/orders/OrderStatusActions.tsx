"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { toast } from "sonner"
import {
  CheckCircle,
  ChefHat,
  Clock,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react"

type OrderStatusActionsProps = {
  orderId: Id<"orders">
  currentStatus:
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "completed"
    | "cancelled"
}

/**
 * Status transition configuration
 * Defines available actions based on current status
 */
const statusTransitions: Record<
  OrderStatusActionsProps["currentStatus"],
  Array<{
    label: string
    nextStatus: OrderStatusActionsProps["currentStatus"]
    variant: "default" | "destructive" | "outline" | "secondary"
    icon: React.ComponentType<{ className?: string }>
    requiresReason?: boolean
  }>
> = {
  pending: [
    {
      label: "Accepter la commande",
      nextStatus: "confirmed",
      variant: "default",
      icon: CheckCircle,
    },
    {
      label: "Refuser la commande",
      nextStatus: "cancelled",
      variant: "destructive",
      icon: XCircle,
      requiresReason: true,
    },
  ],
  confirmed: [
    {
      label: "Commencer la préparation",
      nextStatus: "preparing",
      variant: "default",
      icon: ChefHat,
    },
  ],
  preparing: [
    {
      label: "Marquer comme prête",
      nextStatus: "ready",
      variant: "default",
      icon: PackageCheck,
    },
  ],
  ready: [
    {
      label: "Terminer la commande",
      nextStatus: "completed",
      variant: "default",
      icon: CheckCircle,
    },
    {
      label: "Envoyer en livraison",
      nextStatus: "out_for_delivery",
      variant: "secondary",
      icon: Truck,
    },
  ],
  out_for_delivery: [
    {
      label: "Marquer comme livrée",
      nextStatus: "delivered",
      variant: "default",
      icon: CheckCircle,
    },
  ],
  delivered: [
    {
      label: "Terminer la commande",
      nextStatus: "completed",
      variant: "default",
      icon: CheckCircle,
    },
  ],
  completed: [],
  cancelled: [],
}

/**
 * Order status actions component
 * Displays buttons for transitioning order status
 */
export function OrderStatusActions({
  orderId,
  currentStatus,
}: OrderStatusActionsProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const updateStatus = useMutation(api.orders.updateStatus)

  const availableActions = statusTransitions[currentStatus]

  /**
   * Handle status transition
   */
  const handleStatusChange = async (
    nextStatus: OrderStatusActionsProps["currentStatus"],
    reason?: string
  ) => {
    setIsLoading(true)
    try {
      await updateStatus({
        id: orderId,
        status: nextStatus,
        cancellationReason: reason,
      })

      toast.success("Statut de la commande mis à jour")

      // Reset dialog state
      setShowCancelDialog(false)
      setCancellationReason("")
    } catch (error) {
      toast.error("Échec de la mise à jour du statut")
      console.error("Error updating order status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle button click
   */
  const handleActionClick = (action: typeof availableActions[number]) => {
    if (action.requiresReason) {
      setShowCancelDialog(true)
    } else {
      handleStatusChange(action.nextStatus)
    }
  }

  // No actions available for completed or cancelled orders
  if (availableActions.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Clock className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucune action disponible</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {availableActions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.nextStatus}
              variant={action.variant}
              className="w-full"
              onClick={() => handleActionClick(action)}
              disabled={isLoading}
            >
              <Icon className="size-4" />
              {action.label}
            </Button>
          )
        })}
      </div>

      {/* Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler la commande</DialogTitle>
            <DialogDescription>
              Veuillez fournir un motif d&apos;annulation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reason">Motif d&apos;annulation</Label>
            <Input
              id="reason"
              placeholder="ex : Rupture de stock, Demande du client..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <ButtonGroup>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelDialog(false)
                  setCancellationReason("")
                }}
                disabled={isLoading}
              >
                Fermer
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleStatusChange("cancelled", cancellationReason)}
                disabled={isLoading || !cancellationReason.trim()}
              >
                Annuler la commande
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
