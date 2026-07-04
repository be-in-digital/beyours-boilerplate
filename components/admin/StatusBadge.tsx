import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Common status values across the system
 */
type Status =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "paid"
  | "unpaid"
  | "refunded"
  | "active"
  | "inactive"
  | "draft"

interface StatusBadgeProps {
  status: Status
  className?: string
}

/**
 * Status badge component with color mapping
 * Uses CSS variables for consistent theming
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  /**
   * Get variant and color for each status
   */
  const getStatusStyle = (status: Status) => {
    switch (status) {
      case "pending":
        return {
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        }
      case "confirmed":
        return {
          variant: "secondary" as const,
          className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        }
      case "preparing":
        return {
          variant: "secondary" as const,
          className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        }
      case "ready":
        return {
          variant: "secondary" as const,
          className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        }
      case "completed":
      case "paid":
        return {
          variant: "default" as const,
          className: "bg-green-600 text-white dark:bg-green-700",
        }
      case "cancelled":
        return {
          variant: "destructive" as const,
          className: "",
        }
      case "unpaid":
        return {
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        }
      case "refunded":
        return {
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        }
      case "active":
        return {
          variant: "default" as const,
          className: "bg-green-600 text-white dark:bg-green-700",
        }
      case "inactive":
        return {
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
        }
      case "draft":
        return {
          variant: "outline" as const,
          className: "",
        }
      default:
        return {
          variant: "secondary" as const,
          className: "",
        }
    }
  }

  const style = getStatusStyle(status)

  return (
    <Badge
      variant={style.variant}
      className={cn(style.className, className)}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}
