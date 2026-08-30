"use client"

import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Payment, PaymentStatus, PaymentProvider } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { formatPrice, formatDate } from "@/lib/admin/formatters"
import { Card, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { RefundDialog } from "./RefundDialog"
import { RotateCcw, ExternalLink } from "lucide-react"


const STATUS_CONFIG: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "En attente", variant: "secondary" },
  processing: { label: "En cours", variant: "outline" },
  succeeded: { label: "Réussi", variant: "default" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "secondary" },
  partially_refunded: { label: "Partiellement remboursé", variant: "outline" },
}

const PROVIDER_CONFIG: Record<PaymentProvider, { label: string; color: string }> = {
  stripe: { label: "Stripe", color: "bg-purple-100 text-purple-800" },
  sumup: { label: "SumUp", color: "bg-blue-100 text-blue-800" },
  paypal: { label: "PayPal", color: "bg-sky-100 text-sky-800" },
  square: { label: "Square", color: "bg-gray-100 text-gray-800" },
  cash: { label: "Espèces", color: "bg-green-100 text-green-800" },
}

interface PaymentsContentProps {
  /** When true, hides the page header for embedded usage within tabs */
  embedded?: boolean
}

export function PaymentsContent({ embedded = false }: PaymentsContentProps) {
  const storeId = useAdminStoreId()
  const payments = useQuery(
    api.payments.getByStore,
    storeId ? { storeId } : "skip"
  ) as Payment[] | undefined

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [refundingPayment, setRefundingPayment] = useState<Payment | null>(null)

  // Filter payments
  const filteredPayments = useMemo(() => {
    if (!payments) return null

    let filtered = payments

    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    if (providerFilter !== "all") {
      filtered = filtered.filter((p) => p.provider === providerFilter)
    }

    return filtered
  }, [payments, statusFilter, providerFilter])

  if (!storeId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Veuillez sélectionner un établissement</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Paiements</h1>
            <p className="text-muted-foreground mt-2">
              Consultez les transactions et gérez les remboursements.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="payments-status">
            Statut :
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="payments-status" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="processing">En cours</SelectItem>
              <SelectItem value="succeeded">Réussi</SelectItem>
              <SelectItem value="failed">Échoué</SelectItem>
              <SelectItem value="refunded">Remboursé</SelectItem>
              <SelectItem value="partially_refunded">Partiellement remboursé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="payments-provider">
            Fournisseur :
          </label>
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger id="payments-provider" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les fournisseurs</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="sumup">SumUp</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments table */}
      {!filteredPayments ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyTitle>Aucun paiement trouvé</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>N° commande</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Détails</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const canRefund =
                  payment.status === "succeeded" &&
                  payment.provider !== "cash" &&
                  (payment.refundedAmount || 0) < payment.amount

                return (
                  <TableRow key={payment._id}>
                    <TableCell className="text-sm">
                      {formatDate(payment.createdAt)}
                    </TableCell>

                    <TableCell className="font-mono text-sm">
                      {payment.orderId.slice(-8)}
                    </TableCell>

                    <TableCell className="font-semibold">
                      {formatPrice(payment.amount, payment.currency)}
                      {payment.refundedAmount && payment.refundedAmount > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Remboursé : {formatPrice(payment.refundedAmount, payment.currency)}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={PROVIDER_CONFIG[payment.provider as PaymentProvider].color}
                      >
                        {PROVIDER_CONFIG[payment.provider as PaymentProvider].label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={STATUS_CONFIG[payment.status as PaymentStatus].variant}>
                        {STATUS_CONFIG[payment.status as PaymentStatus].label}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {payment.metadata?.brand && payment.metadata?.last4 && (
                        <div>{payment.metadata.brand} •••• {payment.metadata.last4}</div>
                      )}
                      {payment.externalId && (
                        <div className="font-mono text-xs">{payment.externalId.slice(0, 16)}...</div>
                      )}
                      {payment.refundReason && (
                        <div className="text-xs italic">Motif : {payment.refundReason}</div>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {payment.metadata?.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={payment.metadata.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}

                        {canRefund && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRefundingPayment(payment)}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Rembourser
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Refund dialog */}
      {refundingPayment && (
        <RefundDialog
          payment={refundingPayment}
          open={!!refundingPayment}
          onOpenChange={(open) => !open && setRefundingPayment(null)}
        />
      )}
    </div>
  )
}
