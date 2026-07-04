"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { formatPrice, formatDate, formatOrderNumber } from "@/lib/admin"
import { cn } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

interface Order {
  _id: string
  orderNumber: string
  customerInfo: {
    name: string
    email?: string
    phone?: string
  }
  type: OrderType
  status: OrderStatus
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
  total: number
  createdAt: number
}

interface RecentOrdersTableProps {
  orders: Order[]
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const statusColors: Record<OrderStatus, string> = {
    pending: "bg-status-pending",
    confirmed: "bg-status-confirmed",
    preparing: "bg-status-preparing",
    ready: "bg-status-ready",
    out_for_delivery: "bg-status-delivered",
    delivered: "bg-status-delivered",
    completed: "bg-success",
    cancelled: "bg-status-cancelled",
  }

  const labels: Record<OrderStatus, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    preparing: "En préparation",
    ready: "Prête",
    out_for_delivery: "En livraison",
    delivered: "Livrée",
    completed: "Terminée",
    cancelled: "Annulée",
  }

  const label = labels[status] || labels.pending

  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span className={cn("h-2 w-2 rounded-full", statusColors[status])} />
      {label}
    </span>
  )
}

function OrderTypeBadge({ type }: { type: OrderType }) {
  const labels: Record<OrderType, string> = {
    delivery: "Livraison",
    pickup: "À emporter",
    dine_in: "Sur place",
  }

  return <Badge variant="outline">{labels[type]}</Badge>
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <Card
        className="animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
      >
        <CardHeader>
          <CardTitle>Commandes récentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyTitle>Aucune commande pour le moment</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: "200ms", animationFillMode: "backwards" }}
    >
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Commandes récentes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/orders" className="text-muted-foreground hover:text-foreground">
            Voir tout <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Commande</TableHead>
              <TableHead className="hidden md:table-cell">Client</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order._id} className="cursor-pointer transition-colors hover:bg-muted/50">
                <TableCell>
                  <Link
                    href={`/dashboard/orders/${order._id}`}
                    className="font-medium hover:underline"
                  >
                    {formatOrderNumber(order.orderNumber)}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell">{order.customerInfo.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <OrderTypeBadge type={order.type} />
                </TableCell>
                <TableCell className="text-right">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatPrice(order.total)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground hidden md:table-cell">
                  {formatDate(order.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
