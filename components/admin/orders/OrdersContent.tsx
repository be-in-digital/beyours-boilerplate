"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Order } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { OrdersTable } from "./OrdersTable"
import { KitchenContent } from "../kitchen/KitchenContent"

/**
 * Order status type for filtering
 */
type OrderStatus =
  | "all"
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"

/**
 * Main content component for orders list page
 * Displays orders in tabs filtered by status with search functionality
 * Also includes a Kitchen tab for kitchen display system
 */
export function OrdersContent() {
  const storeId = useAdminStoreId()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState<OrderStatus>("all")

  // Fetch orders for the current store
  const orders = useQuery(
    api.orders.list,
    storeId ? { storeId } : "skip"
  ) as Order[] | undefined

  // Filter orders by status and search query
  const filteredOrders = orders?.filter((order) => {
    const matchesStatus = activeStatus === "all" || order.status === activeStatus
    const matchesSearch =
      searchQuery === "" ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerInfo.name.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  return (
    <Tabs defaultValue="commandes" className="space-y-6">
      {/* Header with top-level tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commandes</h1>
          <p className="text-muted-foreground mt-2">
            Gérez et suivez toutes les commandes du restaurant.
          </p>
        </div>
        <TabsList>
          <TabsTrigger value="commandes">Commandes</TabsTrigger>
          <TabsTrigger value="cuisine">Cuisine</TabsTrigger>
        </TabsList>
      </div>

      {/* Orders list tab */}
      <TabsContent value="commandes" className="space-y-6">
        {/* Search */}
        <div className="max-w-md">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher par n° de commande ou nom du client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>

        {/* Status filter tabs */}
        <Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as OrderStatus)}>
          <TabsList variant="line">
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmées</TabsTrigger>
            <TabsTrigger value="preparing">En préparation</TabsTrigger>
            <TabsTrigger value="ready">Prêtes</TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
            <TabsTrigger value="cancelled">Annulées</TabsTrigger>
          </TabsList>

          <TabsContent value={activeStatus} className="mt-6">
            <OrdersTable orders={filteredOrders || []} isLoading={orders === undefined} />
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* Kitchen tab */}
      <TabsContent value="cuisine">
        <KitchenContent />
      </TabsContent>
    </Tabs>
  )
}
