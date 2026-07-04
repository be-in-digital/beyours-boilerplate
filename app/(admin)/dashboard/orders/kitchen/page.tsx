"use client"

import { KitchenContent } from "@/components/admin/kitchen"
import { SeedKitchenButton } from "./SeedKitchenButton"

export default function KitchenPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cuisine (KDS)</h1>
          <p className="text-muted-foreground">
            Ecran de gestion des tickets cuisine en temps reel
          </p>
        </div>
        <SeedKitchenButton />
      </div>
      <KitchenContent />
    </div>
  )
}
