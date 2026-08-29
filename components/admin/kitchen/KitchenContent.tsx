"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { KitchenTicket } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { TicketCard } from "./TicketCard"
import { StationFilter } from "./StationFilter"
import { resolveSoundConfig } from "@be-in-digital/admin"
import { KitchenSoundManager } from "./KitchenSoundManager"
import { KitchenPrintTrigger } from "./KitchenPrintTrigger"
import { PrintStatusBadge } from "./PrintStatusBadge"
import { CompletedTickets } from "./CompletedTickets"

type ActiveStatus = "pending" | "in_progress" | "ready"

const ACTIVE_STATUSES: ActiveStatus[] = ["pending", "in_progress", "ready"]

const STATUS_CONFIG: Record<ActiveStatus, { title: string; color: string }> = {
  pending: { title: "En attente", color: "bg-yellow-500" },
  in_progress: { title: "En cours", color: "bg-blue-500" },
  ready: { title: "Prêt", color: "bg-green-500" },
}

export function KitchenContent() {
  const storeId = useAdminStoreId()
  const tickets = useQuery(
    api.kitchenTickets.getByStore,
    storeId ? { storeId } : "skip"
  ) as KitchenTicket[] | undefined
  const store = useQuery(api.stores.getById, storeId ? { id: storeId } : "skip")
  const updateStoreOrderMode = useMutation(api.stores.updateOrderMode)

  const [selectedStation, setSelectedStation] = useState<string | null>(null)

  // Resolve current order mode: store.orderMode or fallback to "manual"
  const currentOrderMode = store?.orderMode ?? "manual"

  const handleOrderModeChange = async (value: string) => {
    if (!storeId) return
    try {
      await updateStoreOrderMode({
        id: storeId,
        orderMode: value as "auto_accept" | "auto_reject" | "manual",
      })
      const labels: Record<string, string> = {
        auto_accept: "Auto-accept",
        auto_reject: "Auto-reject",
        manual: "Manuel",
      }
      toast.success(`Mode commandes: ${labels[value]}`)
    } catch (error) {
      toast.error("Echec de la mise a jour")
      console.error(error)
    }
  }

  // Get unique stations from tickets
  const stations = useMemo(() => {
    if (!tickets) return []
    const stationSet = new Set<string>()
    tickets.forEach((ticket: KitchenTicket) => {
      if (ticket.station) {
        stationSet.add(ticket.station)
      }
    })
    return Array.from(stationSet)
  }, [tickets])

  // Filter tickets by station if selected
  const filteredTickets = useMemo(() => {
    if (!tickets) return null
    if (!selectedStation) return tickets
    return tickets.filter((ticket: KitchenTicket) => ticket.station === selectedStation)
  }, [tickets, selectedStation])

  // Group tickets by status
  const ticketsByStatus = useMemo(() => {
    if (!filteredTickets) return null

    return {
      pending: filteredTickets.filter((t: KitchenTicket) => t.status === "pending"),
      in_progress: filteredTickets.filter((t: KitchenTicket) => t.status === "in_progress"),
      ready: filteredTickets.filter((t: KitchenTicket) => t.status === "ready"),
    }
  }, [filteredTickets])

  if (!storeId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Veuillez sélectionner un établissement</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KDS singletons */}
      {store && (
        <>
          <KitchenSoundManager
            storeId={storeId!}
            // Resolved rather than defaulted whole: an establishment
            // configured before an alert existed carries only the alerts it
            // knew about, and reading `undefined.enabled` here would take the
            // kitchen screen down.
            soundConfig={resolveSoundConfig(store.soundConfig)}
            ticketCount={tickets?.length}
          />
          {store.printConfig?.enabled && (
            <KitchenPrintTrigger
              storeId={storeId!}
              printConfig={store.printConfig}
              storeName={store.name}
              onToast={(msg, type) => {
                if (type === "error") toast.error(msg)
                else if (type === "success") toast.success(msg)
                else toast.info(msg)
              }}
            />
          )}
        </>
      )}

      {/* Station filter + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {stations.length > 0 && (
            <StationFilter
              stations={stations}
              selectedStation={selectedStation}
              onStationChange={setSelectedStation}
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select value={currentOrderMode} onValueChange={handleOrderModeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto_accept">Auto-accept</SelectItem>
              <SelectItem value="auto_reject">Auto-reject</SelectItem>
              <SelectItem value="manual">Manuel</SelectItem>
            </SelectContent>
          </Select>
          {storeId && <PrintStatusBadge storeId={storeId} />}
        </div>
      </div>

      {/* Tabs: Actif / Terminées */}
      <Tabs defaultValue="active">
        <TabsList variant="line">
          <TabsTrigger value="active">Actif</TabsTrigger>
          <TabsTrigger value="completed">Terminées</TabsTrigger>
        </TabsList>

        {/* Active kanban */}
        <TabsContent value="active" className="mt-4">
          {!ticketsByStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ACTIVE_STATUSES.map((status) => (
                <div key={status} className="space-y-4">
                  {/* Column header */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {STATUS_CONFIG[status].title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${STATUS_CONFIG[status].color}`}
                          />
                          <span className="text-sm font-medium">
                            {ticketsByStatus[status].length}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Tickets */}
                  <div className="space-y-3">
                    {ticketsByStatus[status].length === 0 ? (
                      <Empty className="py-8">
                        <EmptyHeader>
                          <EmptyTitle>Aucun ticket</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      ticketsByStatus[status].map((ticket: KitchenTicket) => (
                        <TicketCard key={ticket._id} ticket={ticket} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Completed tickets */}
        <TabsContent value="completed" className="mt-4">
          <CompletedTickets storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
