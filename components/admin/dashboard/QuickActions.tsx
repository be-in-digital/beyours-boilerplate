"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ShoppingCart, PlusCircle, ChefHat } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionTile {
  href: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  description: string
}

const actions: ActionTile[] = [
  {
    href: "/dashboard/orders",
    icon: <ShoppingCart className="h-5 w-5" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    label: "Nouvelle commande",
    description: "Créer une commande manuellement",
  },
  {
    href: "/dashboard/products/new",
    icon: <PlusCircle className="h-5 w-5" />,
    iconBg: "bg-success/10",
    iconColor: "text-success",
    label: "Ajouter un produit",
    description: "Ajouter au catalogue",
  },
  {
    href: "/dashboard/orders/kitchen",
    icon: <ChefHat className="h-5 w-5" />,
    iconBg: "bg-info/10",
    iconColor: "text-info",
    label: "Voir la cuisine",
    description: "Écran de préparation",
  },
]

export function QuickActions() {
  return (
    <div className="space-y-3">
      <h3 className="font-heading text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        Actions rapides
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {actions.map((action, index) => (
          <Link key={action.href} href={action.href}>
            <Card
              className={cn(
                "p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-sm cursor-pointer animate-in fade-in slide-in-from-bottom-1"
              )}
              style={{ animationDelay: `${500 + index * 75}ms`, animationFillMode: "backwards" }}
            >
              <div className="flex items-start gap-3">
                <div className={cn("rounded-full p-2.5", action.iconBg, action.iconColor)}>
                  {action.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
