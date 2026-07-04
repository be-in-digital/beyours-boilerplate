import "@/lib/cms/init"
import { StorefrontShell } from "@/components/storefront"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      <StorefrontShell>{children}</StorefrontShell>
    </TooltipProvider>
  )
}
