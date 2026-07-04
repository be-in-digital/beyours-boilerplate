"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/admin"
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TodayStats {
  revenue: number
  orderCount: number
  averageBasket: number
  activeOrders: number
}

interface YesterdayStats {
  revenue: number
  orderCount: number
  averageBasket: number
}

interface StatCardsGridProps {
  today: TodayStats
  yesterday: YesterdayStats
}

interface StatCardConfig {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  colorClass: string
  iconBg: string
  borderColor: string
  gradientFrom: string
  todayValue: number
  yesterdayValue: number
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
        <Minus className="h-3 w-3" />
        <span>—</span>
      </span>
    )
  }

  if (previous === 0) {
    return (
      <span className="text-success inline-flex items-center gap-0.5 text-xs font-medium">
        <ArrowUpRight className="h-3 w-3" />
        <span>Nouveau</span>
      </span>
    )
  }

  const change = ((current - previous) / previous) * 100
  const isPositive = change >= 0

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isPositive ? "text-success" : "text-destructive"
      )}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>{Math.abs(change).toFixed(0)}%</span>
    </span>
  )
}

export function StatCardsGrid({ today, yesterday }: StatCardsGridProps) {
  const cards: StatCardConfig[] = [
    {
      title: "Chiffre d'affaires",
      value: formatPrice(today.revenue),
      subtitle: "Aujourd'hui",
      icon: <DollarSign className="h-5 w-5" />,
      colorClass: "text-primary",
      iconBg: "bg-primary/10",
      borderColor: "border-l-primary",
      gradientFrom: "from-primary/[0.03]",
      todayValue: today.revenue,
      yesterdayValue: yesterday.revenue,
    },
    {
      title: "Commandes",
      value: today.orderCount.toString(),
      subtitle: "Aujourd'hui",
      icon: <ShoppingCart className="h-5 w-5" />,
      colorClass: "text-info",
      iconBg: "bg-info/10",
      borderColor: "border-l-info",
      gradientFrom: "from-info/[0.03]",
      todayValue: today.orderCount,
      yesterdayValue: yesterday.orderCount,
    },
    {
      title: "Panier moyen",
      value: formatPrice(today.averageBasket),
      subtitle: "Aujourd'hui",
      icon: <TrendingUp className="h-5 w-5" />,
      colorClass: "text-success",
      iconBg: "bg-success/10",
      borderColor: "border-l-success",
      gradientFrom: "from-success/[0.03]",
      todayValue: today.averageBasket,
      yesterdayValue: yesterday.averageBasket,
    },
    {
      title: "Commandes actives",
      value: today.activeOrders.toString(),
      subtitle: "En cours",
      icon: <Clock className="h-5 w-5" />,
      colorClass: "text-warning",
      iconBg: "bg-warning/10",
      borderColor: "border-l-warning",
      gradientFrom: "from-warning/[0.03]",
      todayValue: today.activeOrders,
      yesterdayValue: 0,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card
          key={card.title}
          className={cn(
            "border-l-4 bg-gradient-to-br to-transparent transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md animate-in fade-in slide-in-from-bottom-2",
            card.borderColor,
            card.gradientFrom
          )}
          style={{ animationDelay: `${index * 75}ms`, animationFillMode: "backwards" }}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="font-heading text-2xl font-bold tracking-tight">
                  {card.value}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{card.subtitle}</span>
                  {index < 3 && (
                    <TrendIndicator
                      current={card.todayValue}
                      previous={card.yesterdayValue}
                    />
                  )}
                </div>
              </div>
              <div className={cn("rounded-full p-2.5", card.iconBg, card.colorClass)}>
                {card.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
