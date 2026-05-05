import { StorefrontHeader } from "@/components/storefront/header"
import { StorefrontFooter } from "@/components/storefront/footer"

/**
 * Layout for the customer-facing storefront. Distinct from the admin
 * dashboard layout (`(admin)/layout.tsx`) — different audience, different
 * design language, different auth requirements (guest checkout supported).
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <StorefrontHeader />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
    </div>
  )
}
