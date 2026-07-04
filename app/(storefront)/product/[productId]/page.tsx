import type { Metadata } from "next"
import { fetchQuery } from "convex/nextjs"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { ProductDetailClientPage } from "./client"

interface Props {
  params: Promise<{ productId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productId } = await params

  try {
    const product = await fetchQuery(api.products.getById, {
      id: productId as Id<"products">,
    })

    if (!product) {
      return { title: "Produit introuvable" }
    }

    return {
      title: product.name,
      description: product.description ?? `Commandez ${product.name} en ligne`,
      openGraph: {
        title: product.name,
        description: product.description ?? undefined,
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

  return <ProductDetailClientPage product={product} />
}
