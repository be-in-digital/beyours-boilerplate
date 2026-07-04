"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminStoreId } from "@/lib/admin"
import { DashboardHeader } from "./DashboardHeader"
import { StatCardsGrid } from "./StatCardsGrid"
import { OrdersChart } from "./OrdersChart"
import { OrderBreakdown } from "./OrderBreakdown"
import { RecentOrdersTable } from "./RecentOrdersTable"
import { QuickActions } from "./QuickActions"
import { DashboardSkeleton } from "./DashboardSkeleton"

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"

type OrderType = "delivery" | "pickup" | "dine_in"
type OrderSource = "website" | "uber_eats" | "deliveroo" | "pos"

interface Order {
  _id: string
  status: OrderStatus
  type: OrderType
  source?: OrderSource
  createdAt: number
  total: number
  orderNumber: string
  customerInfo: {
    name: string
    email?: string
    phone?: string
  }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

interface DashboardStats {
  today: {
    revenue: number
    orderCount: number
    averageBasket: number
    activeOrders: number
  }
  yesterday: {
    revenue: number
    orderCount: number
    averageBasket: number
  }
  last7Days: Array<{
    day: string
    revenue: number
    orders: number
  }>
  byType: Array<{ name: string; value: number; label: string }>
  bySource: Array<{ name: string; value: number; label: string }>
}

const TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Livraison",
  pickup: "À emporter",
  dine_in: "Sur place",
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Site web",
  uber_eats: "Uber Eats",
  deliveroo: "Deliveroo",
  pos: "Caisse",
}

const DAY_NAMES: Record<number, string> = {
  0: "Dim",
  1: "Lun",
  2: "Mar",
  3: "Mer",
  4: "Jeu",
  5: "Ven",
  6: "Sam",
}

function computeDashboardStats(orders: Order[]): DashboardStats {
  const now = new Date()

  // Today boundaries
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()

  // Yesterday boundaries
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayTs = yesterdayStart.getTime()

  // 30 days ago
  const thirtyDaysAgo = new Date(todayStart)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysTs = thirtyDaysAgo.getTime()

  // Filter non-cancelled orders
  const validOrders = orders.filter((o) => o.status !== "cancelled")

  // Today stats
  const todayOrders = validOrders.filter((o) => o.createdAt >= todayTs)
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)
  const todayCount = todayOrders.length
  const todayAvg = todayCount > 0 ? todayRevenue / todayCount : 0

  // Active orders (all time, not just today)
  const activeStatuses: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "out_for_delivery",
  ]
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status))

  // Yesterday stats
  const yesterdayOrders = validOrders.filter(
    (o) => o.createdAt >= yesterdayTs && o.createdAt < todayTs
  )
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0)
  const yesterdayCount = yesterdayOrders.length
  const yesterdayAvg = yesterdayCount > 0 ? yesterdayRevenue / yesterdayCount : 0

  // Last 7 days chart data
  const last7Days: Array<{ day: string; revenue: number; orders: number }> = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart)
    dayStart.setDate(dayStart.getDate() - i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const dayOrders = validOrders.filter(
      (o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd.getTime()
    )

    last7Days.push({
      day: DAY_NAMES[dayStart.getDay()] ?? "",
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orders: dayOrders.length,
    })
  }

  // Breakdown by type (last 30 days)
  const recentOrders = validOrders.filter((o) => o.createdAt >= thirtyDaysTs)
  const typeCounts: Record<string, number> = {}
  const sourceCounts: Record<string, number> = {}

  for (const order of recentOrders) {
    typeCounts[order.type] = (typeCounts[order.type] || 0) + 1
    const source = order.source || "website"
    sourceCounts[source] = (sourceCounts[source] || 0) + 1
  }

  const byType = Object.entries(typeCounts).map(([name, value]) => ({
    name,
    value,
    label: TYPE_LABELS[name as OrderType] || name,
  }))

  const bySource = Object.entries(sourceCounts).map(([name, value]) => ({
    name,
    value,
    label: SOURCE_LABELS[name] || name,
  }))

  return {
    today: {
      revenue: todayRevenue,
      orderCount: todayCount,
      averageBasket: todayAvg,
      activeOrders: activeOrders.length,
    },
    yesterday: {
      revenue: yesterdayRevenue,
      orderCount: yesterdayCount,
      averageBasket: yesterdayAvg,
    },
    last7Days,
    byType,
    bySource,
  }
}

export function DashboardContent() {
  const storeId = useAdminStoreId()
  const orders = useQuery(api.orders.list, storeId ? { storeId } : "skip")

  if (orders === undefined) {
    return <DashboardSkeleton />
  }

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          Veuillez sélectionner un restaurant pour afficher le tableau de bord.
        </p>
      </div>
    )
  }

  const stats = computeDashboardStats(orders as unknown as Order[])

  return (
    <div className="space-y-6">
      <DashboardHeader />

      <StatCardsGrid today={stats.today} yesterday={stats.yesterday} />

      <OrdersChart data={stats.last7Days} />

      <OrderBreakdown byType={stats.byType} bySource={stats.bySource} />

      <RecentOrdersTable orders={(orders as unknown as Order[]).slice(0, 10)} />

      <QuickActions />
    </div>
  )
}
