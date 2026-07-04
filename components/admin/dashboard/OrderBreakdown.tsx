"use client"

import { PieChart as PieChartIcon } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface OrderBreakdownProps {
  byType: { name: string; value: number; label: string }[]
  bySource: { name: string; value: number; label: string }[]
}

const typeChartConfig = {
  delivery: { label: "Livraison", color: "var(--color-chart-1)" },
  pickup: { label: "À emporter", color: "var(--color-chart-2)" },
  dine_in: { label: "Sur place", color: "var(--color-chart-3)" },
} satisfies ChartConfig

const sourceChartConfig = {
  website: { label: "Site web", color: "var(--color-chart-1)" },
  uber_eats: { label: "Uber Eats", color: "var(--color-chart-2)" },
  deliveroo: { label: "Deliveroo", color: "var(--color-chart-4)" },
  pos: { label: "Caisse", color: "var(--color-chart-5)" },
} satisfies ChartConfig

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

/**
 * Renders a donut chart with data
 */
function DonutChart({
  data,
  config,
}: {
  data: { name: string; value: number; label: string }[]
  config: ChartConfig
}) {
  // Check if data is empty or all values are 0
  const isEmpty = data.length === 0 || data.every((item) => item.value === 0)

  if (isEmpty) {
    return (
      <Empty className="h-[200px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PieChartIcon className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucune donnée</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <ChartContainer config={config} className="h-[200px] w-full">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* Custom legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-3 text-xs">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            <span className="text-muted-foreground">
              {item.label} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * OrderBreakdown component displays two donut charts side by side:
 * - Order type breakdown (delivery/pickup/dine-in)
 * - Order source breakdown (website/uber_eats/deliveroo/pos)
 */
export function OrderBreakdown({ byType, bySource }: OrderBreakdownProps) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 animate-in fade-in duration-500 md:grid-cols-2")}
      style={{ animationDelay: "400ms", animationFillMode: "backwards" }}
    >
      {/* Order Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PieChartIcon className="h-4 w-4" />
            Par type de commande
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={byType} config={typeChartConfig} />
        </CardContent>
      </Card>

      {/* Order Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <PieChartIcon className="h-4 w-4" />
            Par source
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart data={bySource} config={sourceChartConfig} />
        </CardContent>
      </Card>
    </div>
  )
}
