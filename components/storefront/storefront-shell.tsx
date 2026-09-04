"use client"

import { StorefrontHeader } from "./storefront-header"
import { StorefrontFooter } from "./storefront-footer"
import { StoreClosedBanner } from "./store-closed-banner"
import { StorefrontI18nProvider } from "./storefront-i18n-provider"
import { DynamicFavicon } from "../dynamic-favicon"
import { useStoreId } from "@/lib/hooks/use-store-id"
import { useStoreStatus } from "@/lib/hooks/use-store-status"

interface StorefrontShellProps {
  children: React.ReactNode
}

export function StorefrontShell({ children }: StorefrontShellProps) {
  const { storeId } = useStoreId()
  const { isOpen, isLoading, hoursStatus } = useStoreStatus(storeId)

  const nextOpenTime = hoursStatus?.nextChange
    ? hoursStatus.nextChange.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const showBanner = !!storeId && !isLoading && !isOpen

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontI18nProvider />
      <DynamicFavicon />
      {showBanner && <StoreClosedBanner nextOpenTime={nextOpenTime} />}
      <StorefrontHeader hasBanner={showBanner} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  )
}
