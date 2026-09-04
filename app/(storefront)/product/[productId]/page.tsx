import type { Metadata } from "next"
import { cookies } from "next/headers"
import { fetchQuery } from "convex/nextjs"
import {
  LOCALE_COOKIE_NAME,
  localizeDocument,
  normalizeStoredLocale,
} from "@be-in-digital/core"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ProductDetailClientPage } from "./client"

interface Props {
  params: Promise<{ productId: string }>
}

/**
 * The locale this request should be answered in.
 *
 * `beid_locale` is the cookie `setLocale` writes and `app/layout.tsx` reads.
 * Server rendering has to read the same one or the page ships a French title
 * to a visitor who asked for Spanish — which is what a crawler sees, and a
 * crawler never runs the client half that would have fixed it.
 */
async function requestLocale(): Promise<string | null> {
  const cookieStore = await cookies()
  return normalizeStoredLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params

  try {
    const [product, locale] = await Promise.all([
      fetchQuery(api.products.getById, { id: productId as Id<"products"> }),
      requestLocale(),
    ])

    if (!product) {
      return { title: "Produit introuvable" }
    }

    const { name, description } = localizeDocument(product, locale)

    return {
      title: name,
      description: description ?? `Commandez ${name} en ligne`,
      openGraph: {
        title: name,
        description: description ?? undefined,
        images: product.images?.[0] ? [product.images[0]] : undefined,
      },
    }
  } catch {
    return { title: "Produit" }
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { productId } = await params

  let product = null
  try {
    product = await fetchQuery(api.products.getById, {
      id: productId as Id<"products">,
    })
  } catch {
    // Product not found
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Produit introuvable</h1>
        <p className="mt-2 text-muted-foreground">
          Ce produit n&apos;existe pas ou a été supprimé.
        </p>
        <a href="/menu" className="mt-4 inline-block text-primary hover:underline">
          Retour au menu
        </a>
      </div>
    )
  }

  // Localised on the server too, not only in the client component below: the
  // first paint is what a crawler indexes and what a slow connection shows
  // for a second, and both used to be the source language whatever the
  // visitor had chosen.
  const locale = await requestLocale()
  const { name, description } = localizeDocument(product, locale)

  return (
    <ProductDetailClientPage
      product={{
        ...product,
        name,
        ...(description === undefined ? {} : { description }),
      }}
    />
  )
}
