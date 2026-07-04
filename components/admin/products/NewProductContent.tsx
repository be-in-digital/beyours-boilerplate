"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { eurosToCents } from "@/lib/admin/formatters"
import { ProductForm } from "./ProductForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export function NewProductContent() {
  const router = useRouter()
  const storeId = useAdminStoreId()
  const [isLoading, setIsLoading] = useState(false)

  const createProduct = useMutation(api.products.create)

  // Fetch categories for the form
  const categories = useQuery(
    api.categories.list,
    storeId ? { storeId } : "skip"
  )

  const handleSubmit = async (data: {
    categoryId: string
    name: string
    slug: string
    description?: string
    priceEuros: number
    compareAtPriceEuros?: number
    taxRate?: number
    preparationTime?: number
    sku?: string
    images?: string[]
    options?: Array<{
      id: string
      name: string
      required: boolean
      maxSelections?: number
      externalIds?: {
        uberEatsId?: string
        deliverooId?: string
      }
      choices: Array<{
        id: string
        name: string
        priceModifier: number
        externalIds?: {
          uberEatsId?: string
          deliverooId?: string
        }
      }>
    }>
    allergens?: string[]
    tags?: string[]
    stock?: {
      tracked: boolean
      quantity: number
      lowStockThreshold: number
    }
    scheduling?: {
      availableFrom?: string
      availableUntil?: string
      availableDays?: number[]
    }
    spiceLevel?: number
    isActive?: boolean
    isFeatured?: boolean
    sortOrder?: number
  }) => {
    if (!storeId) {
      toast.error("Veuillez sélectionner un établissement")
      return
    }

    setIsLoading(true)

    try {
      // Convert euro prices to cents
      const priceInCents = eurosToCents(data.priceEuros)
      const compareAtPriceInCents = data.compareAtPriceEuros
        ? eurosToCents(data.compareAtPriceEuros)
        : undefined

      // Convert option choice price modifiers to cents
      const optionsWithCents = data.options?.map((option: {
        id: string
        name: string
        required: boolean
        maxSelections?: number
        externalIds?: { uberEatsId?: string; deliverooId?: string }
        choices: Array<{
          id: string
          name: string
          priceModifier: number
          externalIds?: { uberEatsId?: string; deliverooId?: string }
        }>
      }) => ({
        ...option,
        choices: option.choices.map((choice: {
          id: string
          name: string
          priceModifier: number
          externalIds?: { uberEatsId?: string; deliverooId?: string }
        }) => ({
          ...choice,
          priceModifier: eurosToCents(choice.priceModifier || 0),
        })),
      }))

      await createProduct({
        storeId,
        categoryId: data.categoryId as Id<"categories">,
        name: data.name,
        slug: data.slug,
        description: data.description,
        price: priceInCents,
        compareAtPrice: compareAtPriceInCents,
        taxRate: data.taxRate ?? 0,
        preparationTime: data.preparationTime,
        sku: data.sku,
        images: data.images || [],
        options: optionsWithCents || [],
        allergens: data.allergens || [],
        tags: data.tags || [],
        stock: data.stock,
        scheduling: data.scheduling,
        spiceLevel: data.spiceLevel,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        sortOrder: data.sortOrder ?? 0,
        source: "manual",
      })

      toast.success("Produit créé avec succès")
      router.push("/dashboard/products")
    } catch (error) {
      toast.error("Échec de la création du produit")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!storeId) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">
          Veuillez sélectionner un établissement pour créer un produit
        </p>
      </div>
    )
  }

  if (!categories) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Créer un produit</h1>
          <p className="text-muted-foreground mt-2">
            Ajoutez un nouveau produit à votre menu
          </p>
        </div>

        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            Vous devez créer au moins une catégorie avant d&apos;ajouter des produits
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/categories">Créer une catégorie</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Créer un produit</h1>
          <p className="text-muted-foreground mt-2">
            Ajoutez un nouveau produit à votre menu
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl">
        <ProductForm
          categories={categories}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel="Créer un produit"
        />
      </div>
    </div>
  )
}
