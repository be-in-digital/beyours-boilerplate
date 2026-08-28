"use client"

import { useState } from "react"
import { useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Payment } from "@/lib/admin/types"
import { toast } from "sonner"
import { formatPrice } from "@/lib/admin/formatters"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"

interface RefundDialogProps {
  payment: Payment
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RefundDialog({ payment, open, onOpenChange }: RefundDialogProps) {
  // An action, not a mutation: the refund calls the payment provider before
  // anything is recorded. `payments.refund` was a database-only patch that
  // reported success while the customer was never paid back.
  const refundPayment = useAction(api.payments.refundPayment)

  const maxRefundAmount = payment.amount - (payment.refundedAmount || 0)
  const [refundAmount, setRefundAmount] = useState(maxRefundAmount)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRefund = async () => {
    // Validate amount
    if (refundAmount <= 0) {
      toast.error("Le montant du remboursement doit être supérieur à 0")
      return
    }

    if (refundAmount > maxRefundAmount) {
      toast.error(
        `Le montant du remboursement ne peut pas dépasser ${formatPrice(maxRefundAmount, payment.currency)}`
      )
      return
    }

    setIsSubmitting(true)

    try {
      await refundPayment({
        id: payment._id,
        amount: refundAmount,
        reason: reason.trim() || undefined,
      })

      toast.success(
        `Remboursement de ${formatPrice(refundAmount, payment.currency)} traité avec succès`
      )
      onOpenChange(false)

      // Reset form
      setRefundAmount(maxRefundAmount)
      setReason("")
    } catch (error) {
      toast.error("Échec du traitement du remboursement")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Convert cents to display value
  const amountInDollars = (refundAmount / 100).toFixed(2)

  // Handle amount input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value)) {
      // Convert dollars to cents
      setRefundAmount(Math.round(value * 100))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remboursement</DialogTitle>
          <DialogDescription>
            Effectuez un remboursement total ou partiel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original amount info */}
          <div className="text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant initial :</span>
              <span className="font-medium">
                {formatPrice(payment.amount, payment.currency)}
              </span>
            </div>
            {payment.refundedAmount && payment.refundedAmount > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Déjà remboursé :</span>
                <span className="font-medium">
                  {formatPrice(payment.refundedAmount, payment.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between mt-1 border-t pt-1">
              <span className="text-muted-foreground">Remboursement max :</span>
              <span className="font-semibold">
                {formatPrice(maxRefundAmount, payment.currency)}
              </span>
            </div>
          </div>

          {/* Refund amount input */}
          <div className="space-y-2">
            <Label htmlFor="refundAmount">Montant du remboursement</Label>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>
                  {payment.currency === "EUR" ? "€" : "$"}
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="refundAmount"
                type="number"
                step="0.01"
                min="0.01"
                max={(maxRefundAmount / 100).toFixed(2)}
                value={amountInDollars}
                onChange={handleAmountChange}
              />
            </InputGroup>
            <p className="text-xs text-muted-foreground">
              Montant à rembourser (max : {formatPrice(maxRefundAmount, payment.currency)})
            </p>
          </div>

          {/* Reason textarea */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motif (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Saisissez le motif du remboursement..."
              rows={3}
            />
          </div>

          {/* Quick action buttons */}
          <ButtonGroup>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundAmount(maxRefundAmount)}
            >
              Remboursement total
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRefundAmount(Math.round(maxRefundAmount / 2))}
            >
              Demi remboursement
            </Button>
          </ButtonGroup>
        </div>

        <DialogFooter>
          <ButtonGroup>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRefund}
              disabled={isSubmitting || refundAmount <= 0 || refundAmount > maxRefundAmount}
            >
              {isSubmitting
                ? "Traitement..."
                : `Rembourser ${formatPrice(refundAmount, payment.currency)}`}
            </Button>
          </ButtonGroup>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
