"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatPrice, formatOrderNumber, formatDate } from "@/lib/admin/formatters"
import type { Order, OrderStatus, OrderType, OrderPaymentStatus as PaymentStatus, OrderItem } from "@/lib/admin/types"

type OrdersTableProps = {
  orders: Order[]
  isLoading: boolean
}

/**
 * Get badge variant and label for order status
 */
function getStatusBadge(status: OrderStatus) {
  const statusConfig: Record<OrderStatus, { className: string; label: string }> = {
    pending: { className: "bg-yellow-100 text-yellow-800", label: "En attente" },
    confirmed: { className: "bg-blue-100 text-blue-800", label: "Confirmée" },
    preparing: { className: "bg-orange-100 text-orange-800", label: "En préparation" },
    ready: { className: "bg-green-100 text-green-800", label: "Prête" },
    out_for_delivery: { className: "bg-purple-100 text-purple-800", label: "En livraison" },
    delivered: { className: "bg-green-100 text-green-800", label: "Livrée" },
    completed: { className: "bg-gray-100 text-gray-800", label: "Terminée" },
    cancelled: { className: "bg-red-100 text-red-800", label: "Annulée" },
  }

  const config = statusConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

/**
 * Get badge variant and label for order type
 */
function getTypeBadge(type: OrderType) {
  const typeConfig: Record<OrderType, { variant: "default" | "secondary" | "outline"; label: string }> = {
    delivery: { variant: "default", label: "Livraison" },
    pickup: { variant: "secondary", label: "À emporter" },
    dine_in: { variant: "outline", label: "Sur place" },
  }

  const config = typeConfig[type]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

/**
 * Get badge variant and label for payment status
 */
function getPaymentBadge(status: PaymentStatus) {
  const paymentConfig: Record<PaymentStatus, { className: string; label: string }> = {
    pending: { className: "bg-yellow-100 text-yellow-800", label: "En attente" },
    paid: { className: "bg-green-100 text-green-800", label: "Payé" },
    failed: { className: "bg-red-100 text-red-800", label: "Échoué" },
    refunded: { className: "bg-gray-100 text-gray-800", label: "Remboursé" },
    partially_refunded: { className: "bg-orange-100 text-orange-800", label: "Remboursé partiellement" },
  }

  const config = paymentConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

/**
 * Calculate total items count from order items
 */
function getTotalItems(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

/**
 * Orders table component
 * Displays orders in a table with columns for key information
 */
export function OrdersTable({ orders, isLoading }: OrdersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement des commandes...</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyTitle>Aucune commande trouvée</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Commande</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Paiement</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id} className="cursor-pointer">
              <TableCell>
                <Link
                  href={`/dashboard/orders/${order._id}`}
                  className="font-medium hover:underline"
                >
                  {formatOrderNumber(order.orderNumber)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`} className="hover:underline">
                  {order.customerInfo.name}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`}>
                  {getTypeBadge(order.type)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`}>
                  {getTotalItems(order.items)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`} className="font-medium">
                  {formatPrice(order.total)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`}>
                  {getStatusBadge(order.status)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/dashboard/orders/${order._id}`}>
                  {getPaymentBadge(order.paymentStatus)}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <Link href={`/dashboard/orders/${order._id}`}>
                  {formatDate(order.createdAt)}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
