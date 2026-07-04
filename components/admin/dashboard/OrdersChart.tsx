"use client"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { BarChart3 } from "lucide-react"
import { formatPrice } from "@/lib/admin"

interface DayData {
  day: string
  revenue: number
  orders: number
}

interface OrdersChartProps {
  data: DayData[]
}

const chartConfig = {
  revenue: {
    label: "Chiffre d'affaires",
    color: "var(--color-chart-1)",
  },
} satisfies ChartConfig

export function OrdersChart({ data }: OrdersChartProps) {
  const hasData = data.some((d) => d.orders > 0)

  return (
    <Card className="animate-in fade-in duration-500" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <BarChart3 className="text-muted-foreground h-4 w-4" />
          Revenus des 7 derniers jours
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <Empty className="h-[250px] sm:h-[300px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>Aucune donnée sur les 7 derniers jours</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[300px]">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                tickFormatter={(value: number) => `${(value / 100).toFixed(0)}€`}
                className="text-xs"
                width={45}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatPrice(value as number)}
                    labelFormatter={(label) => `${label}`}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
