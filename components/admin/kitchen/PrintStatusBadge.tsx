"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Printer } from "lucide-react"

interface PrintStatusBadgeProps {
  storeId: Id<"stores">
}

export function PrintStatusBadge({ storeId }: PrintStatusBadgeProps) {
  const overdueCount = useQuery(api.kitchenTickets.getOverdueCount, { storeId })
  const printStuckCount = useQuery(api.kitchenTickets.getPrintStuckCount, { storeId })

  if (!overdueCount && !printStuckCount) return null

  return (
    <div className="flex items-center gap-2">
      {overdueCount !== undefined && overdueCount > 0 && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {overdueCount} en retard
        </Badge>
      )}
      {printStuckCount !== undefined && printStuckCount > 0 && (
        <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800">
          <Printer className="h-3 w-3" />
          {printStuckCount} non imprime{printStuckCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  )
}
