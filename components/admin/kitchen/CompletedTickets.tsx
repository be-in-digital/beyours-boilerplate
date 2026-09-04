"use client"

import { useState, useMemo } from "react"
import { usePaginatedQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { KitchenTicket } from "@/lib/admin/types"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { TicketCard } from "./TicketCard"

/** One page of history. Large enough to fill the grid, small enough to be cheap. */
const COMPLETED_PAGE_SIZE = 50

type Source = "all" | "website" | "uber_eats" | "deliveroo" | "pos"
type OrderType = "all" | "delivery" | "pickup" | "dine_in"

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "all", label: "Toutes les sources" },
  { value: "website", label: "Site web" },
  { value: "uber_eats", label: "Uber Eats" },
  { value: "deliveroo", label: "Deliveroo" },
  { value: "pos", label: "Caisse" },
]

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "delivery", label: "Livraison" },
  { value: "pickup", label: "A emporter" },
  { value: "dine_in", label: "Sur place" },
]

interface CompletedTicketsProps {
  storeId: Id<"stores">
}

export function CompletedTickets({ storeId }: CompletedTicketsProps) {
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<Source>("all")
  const [typeFilter, setTypeFilter] = useState<OrderType>("all")

  // The completed history is the class that grows for ever, and this screen
  // used to ask for all of it at once: one `.collect()` over every ticket the
  // establishment had ever finished, materialised on the tablet. It is the tab
  // that dies first, and it takes the kitchen's own screen with it.
  //
  // A page at a time, on Convex's own cursor.
  const {
    results: tickets,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.kitchenTickets.getByStatus,
    { storeId, status: "completed" },
    { initialNumItems: COMPLETED_PAGE_SIZE }
  )

  const filteredTickets = useMemo(() => {
    if (pageStatus === "LoadingFirstPage") return null

    return (tickets as KitchenTicket[]).filter((ticket: KitchenTicket) => {
      // Source filter
      if (sourceFilter !== "all" && ticket.source !== sourceFilter) return false

      // Order type filter
      if (typeFilter !== "all" && ticket.orderType !== typeFilter) return false

      // Search filter
      if (search) {
        const q = search.toLowerCase()
        const matchesOrder = ticket.orderNumber.toLowerCase().includes(q)
        const matchesCustomer = ticket.customerName?.toLowerCase().includes(q) ?? false
        const matchesProduct = ticket.items.some(
          (item) => item.productName.toLowerCase().includes(q)
        )
        if (!matchesOrder && !matchesCustomer && !matchesProduct) return false
      }

      return true
    })
  }, [tickets, pageStatus, search, sourceFilter, typeFilter])

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro, client, produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as Source)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as OrderType)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filteredTickets === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyTitle>
              {search || sourceFilter !== "all" || typeFilter !== "all"
                ? "Aucun ticket ne correspond aux filtres"
                : "Aucune commande terminée"}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((ticket: KitchenTicket) => (
              <TicketCard key={ticket._id} ticket={ticket} />
            ))}
          </div>

          {pageStatus !== "Exhausted" && (
            <div className="flex flex-col items-center gap-2 pt-2">
              {/* Say what is on screen, because the filters above search only
                  what has been loaded — a silent window reads as "no result". */}
              <p className="text-xs text-muted-foreground">
                {tickets.length} commande{tickets.length > 1 ? "s" : ""} chargée
                {tickets.length > 1 ? "s" : ""}
              </p>
              <Button
                variant="outline"
                size="sm"
                data-testid="load-more-completed"
                disabled={pageStatus === "LoadingMore"}
                onClick={() => loadMore(COMPLETED_PAGE_SIZE)}
              >
                {pageStatus === "LoadingMore" ? "Chargement…" : "Charger les suivantes"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
