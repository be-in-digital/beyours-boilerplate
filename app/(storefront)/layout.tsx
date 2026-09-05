import "@/lib/cms/init"
import type { Metadata } from "next"
import { StorefrontShell } from "@/components/storefront"
import { TooltipProvider } from "@/components/ui/tooltip"
import { JsonLd } from "@/lib/json-ld"
import { resolveSiteBaseUrl } from "@/lib/seo"
import { getRestaurantJsonLd, getStorefrontSeoContext } from "@/lib/structured-data"

/**
 * Site-wide metadata for the storefront.
 *
 * `metadataBase` is the piece every page depends on and none of them could set
 * for themselves: without it Next.js leaves a relative Open Graph image
 * relative, and a relative `og:image` is simply not fetched by the crawlers
 * that matter. Pages that build their own metadata set it too; this covers the
 * ones that do not.
 *
 * No title template. The establishment's name is already in `og:site_name` and
 * in the structured data, and appending it to a meta title the owner wrote
 * themselves is how a page ends up titled "Menu — Chez Luigi — Chez Luigi".
 */
export async function generateMetadata(): Promise<Metadata> {
  const [baseUrl, { brandName }] = await Promise.all([
    resolveSiteBaseUrl(),
    getStorefrontSeoContext(),
  ])

  return {
    metadataBase: new URL(baseUrl),
    ...(brandName ? { title: brandName } : {}),
    openGraph: {
      type: "website",
      ...(brandName ? { siteName: brandName } : {}),
    },
    twitter: { card: "summary_large_image" },
  }
}

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The establishment, once, for every storefront page: its address, opening
  // hours, telephone and price range are the same on all of them, and a search
  // engine that finds any one page should learn the whole entity from it.
  const restaurant = await getRestaurantJsonLd()

  return (
    <TooltipProvider>
      <JsonLd data={restaurant} />
      <StorefrontShell>{children}</StorefrontShell>
    </TooltipProvider>
  )
}
