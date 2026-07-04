"use client"

import "@/lib/cms/init"
import { useEffect } from "react"
import { api } from "@/convex/_generated/api"
import { AdminAuthSync } from "@/components/admin/AdminAuthSync"
import { useCmsPage } from "@/lib/cms/useCmsPage"
import {
  AuthGuard,
  AppSidebar,
  AdminHeader,
  SidebarProvider,
  SidebarInset,
  StoreSelector,
  SidebarUserMenu,
  StoreGuard,
  useAdminApiStore,
  OnboardingTourProvider,
  ReplayTourButton,
} from "@be-in-digital/admin"

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const cms = useCmsPage("storefront-layout")
  const logoUrl = cms.block("branding").field("logo").mediaUrl
  const brandName = cms.block("branding").field("brandName").text ?? undefined

  return (
    <SidebarProvider>
      <AppSidebar
        userFooter={
          <>
            <ReplayTourButton />
            <SidebarUserMenu />
          </>
        }
        logoUrl={logoUrl}
        brandName={brandName}
      />
      <SidebarInset>
        <AdminHeader storeSelector={<StoreSelector />} />
        <main className="flex-1 px-6 py-5 lg:px-8 min-w-0 overflow-x-hidden" data-tour="main-content">
          <div className="mx-auto max-w-[1600px]">
            <StoreGuard>{children}</StoreGuard>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    useAdminApiStore.getState().setApi(api as unknown as Record<string, unknown>)
  }, [])

  return (
    <>
      <AdminAuthSync />
      <AuthGuard>
        <OnboardingTourProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </OnboardingTourProvider>
      </AuthGuard>
    </>
  )
}
