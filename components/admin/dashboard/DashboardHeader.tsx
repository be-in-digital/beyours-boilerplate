"use client"

import { useAdminAuthStore } from "@be-in-digital/admin"
import { useStoreStore } from "@be-in-digital/restaurant"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bonjour"
  if (hour < 18) return "Bon après-midi"
  return "Bonsoir"
}

function getFormattedDate(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

export function DashboardHeader() {
  const user = useAdminAuthStore((s) => s.user)
  const currentStore = useStoreStore((s) => s.currentStore)

  const firstName = user?.name?.split(" ")[0] ?? ""
  const greeting = getGreeting()
  const date = getFormattedDate()

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        {greeting}
        {firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="text-muted-foreground mt-1 text-sm sm:text-base">
        {date}
        {currentStore?.name && (
          <span className="text-foreground/70"> · {currentStore.name}</span>
        )}
      </p>
    </div>
  )
}
