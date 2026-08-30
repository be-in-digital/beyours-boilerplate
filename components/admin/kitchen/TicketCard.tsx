"use client"

import { useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { KitchenTicket, TicketStatus, TicketOrderType as OrderType, TicketPriority as Priority, TicketSource as Source } from "@/lib/admin/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TicketTimer } from "./TicketTimer"
import { Clock, Play, CheckCircle, Package, Printer, X } from "lucide-react"

interface TicketCardProps {
  ticket: KitchenTicket
}

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Livraison",
  pickup: "À emporter",
  dine_in: "Sur place",
}

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  normal: { label: "Normal", variant: "secondary" },
  urgent: { label: "Urgent", variant: "default" },
  vip: { label: "VIP", variant: "destructive" },
}

const SOURCE_CONFIG: Record<Source, { label: string; color: string }> = {
  website: { label: "Site web", color: "bg-blue-100 text-blue-800" },
  uber_eats: { label: "Uber Eats", color: "bg-green-100 text-green-800" },
  deliveroo: { label: "Deliveroo", color: "bg-cyan-100 text-cyan-800" },
  pos: { label: "Caisse", color: "bg-purple-100 text-purple-800" },
}

const STATUS_ACTIONS: Record<TicketStatus, { label: string; nextStatus: TicketStatus | null; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Démarrer", nextStatus: "in_progress", icon: Play },
  in_progress: { label: "Prêt", nextStatus: "ready", icon: CheckCircle },
  ready: { label: "Récupéré", nextStatus: "completed", icon: Package },
  completed: { label: "Terminé", nextStatus: null, icon: CheckCircle },
  cancelled: { label: "Annulé", nextStatus: null, icon: X },
}

const PRINT_STATUS_ICON: Record<string, string> = {
  pending: "...",
  printed: "OK",
  failed: "!",
  not_required: "",
}

const DELIVEROO_REJECT_REASONS = [
  { value: "store_busy", label: "Restaurant trop occupé" },
  { value: "closing_soon", label: "Fermeture imminente" },
  { value: "item_unavailable", label: "Article indisponible" },
  { value: "pos_item_id_not_found", label: "Produit non trouvé (PLU manquant)" },
  { value: "pos_item_id_mismatched", label: "Produit non reconnu (PLU incorrect)" },
  { value: "items_out_of_stock", label: "Rupture de stock" },
  { value: "other", label: "Autre raison" },
] as const

function isPrintStuck(ticket: KitchenTicket): boolean {
  if (ticket.printStatus !== "pending") return false
  if (!ticket.printRequestedAt) return false
  return Date.now() - ticket.printRequestedAt > 2 * 60 * 1000
}

export function TicketCard({ ticket }: TicketCardProps) {
  const updateStatusMutation = useMutation(api.kitchenTickets.updateStatus)
  const requestReprintMutation = useMutation(api.kitchenTickets.requestReprint)
  const acceptTicketAction = useAction(api.kitchenTickets.acceptTicket)
  const readyTicketAction = useAction(api.kitchenTickets.readyTicket)
  const completeTicketAction = useAction(api.kitchenTickets.completeTicket)
  const cancelTicketAction = useAction(api.kitchenTickets.cancelTicket)

  const handleStatusChange = async () => {
    const action = STATUS_ACTIONS[ticket.status]
    if (!action.nextStatus) return

    try {
      // pending → in_progress: accept (notify Uber Eats / Deliveroo)
      if (ticket.status === "pending" && (ticket.source === "uber_eats" || ticket.source === "deliveroo")) {
        await acceptTicketAction({ id: ticket._id })
        toast.success(ticket.source === "uber_eats" ? "Commande acceptee sur Uber Eats" : "Commande acceptee sur Deliveroo")
        return
      }

      // in_progress → ready: mark as ready (update order status)
      if (ticket.status === "in_progress") {
        await readyTicketAction({ id: ticket._id })
        toast.success("Commande prête")
        return
      }

      // ready → completed: mark picked up (update order status)
      if (ticket.status === "ready") {
        await completeTicketAction({ id: ticket._id })
        toast.success("Commande recuperee")
        return
      }

      // Fallback for non-platform orders
      await updateStatusMutation({
        id: ticket._id,
        status: action.nextStatus,
      })
      toast.success(`Ticket deplace vers ${action.nextStatus.replace("_", " ")}`)
    } catch (error) {
      toast.error("Échec de la mise à jour du statut du ticket")
      console.error(error)
    }
  }

  const handleCancel = async (reason?: string) => {
    try {
      await cancelTicketAction({ id: ticket._id, reason })
      toast.success("Commande annulée")
    } catch (error) {
      toast.error("Échec de l'annulation")
      console.error(error)
    }
  }

  const handleReprint = async () => {
    try {
      await requestReprintMutation({ id: ticket._id })
      toast.success("Réimpression demandée")
    } catch (error) {
      toast.error("Échec de la demande de réimpression")
      console.error(error)
    }
  }

  const action = STATUS_ACTIONS[ticket.status]
  const ActionIcon = action.icon
  const showPrintBadge = ticket.printStatus && ticket.printStatus !== "not_required"
  const printStuck = isPrintStuck(ticket)
  const isDeliveroo = ticket.source === "deliveroo"

  return (
    <Card className="relative flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">#{ticket.orderNumber}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {ORDER_TYPE_LABELS[ticket.orderType]}
              </Badge>
              <Badge
                variant={PRIORITY_CONFIG[ticket.priority].variant}
                className="text-xs"
              >
                {PRIORITY_CONFIG[ticket.priority].label}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showPrintBadge && (
              <span className="text-xs font-mono" title={`Impression: ${ticket.printStatus}`}>
                [{PRINT_STATUS_ICON[ticket.printStatus ?? "not_required"]}]
              </span>
            )}
            {ticket.printStatus !== "not_required" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReprint}
                title="Réimprimer"
              >
                <Printer className="h-4 w-4" />
              </Button>
            )}
            <TicketTimer createdAt={ticket.createdAt} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Source badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-xs ${SOURCE_CONFIG[ticket.source].color}`}
          >
            {SOURCE_CONFIG[ticket.source].label}
          </Badge>
          {ticket.station && (
            <Badge variant="outline" className="text-xs">
              {ticket.station}
            </Badge>
          )}
        </div>

        {/* Print stuck warning */}
        {printStuck && (
          <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
            <span>Non imprimée</span>
          </div>
        )}

        {/* Items */}
        <div className="space-y-2">
          {ticket.items.map((item, index) => (
            <div key={index} className="text-sm">
              <div className="font-medium">
                {item.quantity}x {item.productName}
              </div>
              {item.options.length > 0 && (
                <div className="text-xs text-muted-foreground ml-4">
                  {item.options.join(", ")}
                </div>
              )}
              {item.notes && (
                <div className="text-xs text-muted-foreground italic ml-4">
                  Note : {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Estimated prep time */}
        {ticket.estimatedPrepTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Est. {ticket.estimatedPrepTime} min</span>
          </div>
        )}
      </CardContent>

      {/* Sticky action footer with big buttons */}
      {ticket.status !== "completed" && ticket.status !== "cancelled" && (
        <div className="p-4 pt-0">
          {ticket.status === "pending" && (
            <div className="flex gap-2">
              <Button
                onClick={handleStatusChange}
                className="flex-1 min-h-16 text-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ActionIcon className="mr-2 h-5 w-5" />
                {action.label}
              </Button>
              {isDeliveroo ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-h-16 px-4 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Raison du refus</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {DELIVEROO_REJECT_REASONS.map((reason) => (
                      <DropdownMenuItem
                        key={reason.value}
                        onClick={() => handleCancel(reason.value)}
                        className="cursor-pointer"
                      >
                        {reason.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => handleCancel()}
                  variant="outline"
                  className="min-h-16 px-4 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {ticket.status === "in_progress" && (
            <div className="flex gap-2">
              <Button
                onClick={handleStatusChange}
                className="flex-1 min-h-16 text-lg bg-green-600 hover:bg-green-700 text-white"
              >
                <ActionIcon className="mr-2 h-5 w-5" />
                {action.label}
              </Button>
              {isDeliveroo ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="min-h-16 px-4 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Raison du refus</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {DELIVEROO_REJECT_REASONS.map((reason) => (
                      <DropdownMenuItem
                        key={reason.value}
                        onClick={() => handleCancel(reason.value)}
                        className="cursor-pointer"
                      >
                        {reason.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => handleCancel()}
                  variant="outline"
                  className="min-h-16 px-4 border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {ticket.status === "ready" && (
            <Button
              onClick={handleStatusChange}
              className="w-full min-h-16 text-lg bg-orange-600 hover:bg-orange-700 text-white"
            >
              <ActionIcon className="mr-2 h-5 w-5" />
              {action.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
