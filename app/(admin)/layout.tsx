"use client"

import {
  AuthGuard,
  AppSidebar,
  AdminHeader,
  SidebarProvider,
  SidebarInset,
  StoreSelector,
  SidebarUserMenu,
  StoreGuard,
} from "@be-in-digital/admin"
import { AdminAuthSync } from "@/components/admin-auth-sync"
import { AdminApiInit } from "@/components/admin-api-init"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
    <AdminAuthSync />
    <AdminApiInit />
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar
          userFooter={<SidebarUserMenu />}
        />
        <SidebarInset>
          <AdminHeader storeSelector={<StoreSelector />} />
          <main className="flex-1 px-6 py-5 lg:px-8 min-w-0 overflow-x-hidden">
            <div className="mx-auto max-w-[1600px]">
              <StoreGuard>{children}</StoreGuard>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
    </>
  )
}
