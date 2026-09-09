"use client"

import { CartAnnouncer } from "./cart-announcer"
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
    // `storefront-theme` is what makes the tokens below resolve to this
    // establishment's colours rather than the administration's. It carries the
    // storefront's own default palette (`app/globals.css`), which an
    // establishment's saved branding then overrides from `StoreTheme`.
    <div className="storefront-theme flex min-h-screen flex-col bg-background text-foreground">
      <StorefrontI18nProvider />
      <DynamicFavicon />
      {/*
        Here rather than in the cart sheet, and for a reason that is not
        tidiness: a live region has to be in the document before its contents
        change, and the sheet is a dialog that unmounts when closed. Every
        mutation made from a product card — which is most of them — would
        happen while a region inside the sheet did not exist.
      */}
      <CartAnnouncer />
      {showBanner && <StoreClosedBanner nextOpenTime={nextOpenTime} />}
      <StorefrontHeader hasBanner={showBanner} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  )
}
