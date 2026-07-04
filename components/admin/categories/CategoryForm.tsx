"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  slug: z.string().min(1, "Le slug est requis").max(100, "Le slug est trop long"),
  description: z.string().max(500, "La description est trop longue").optional(),
  isActive: z.boolean(),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface CategoryFormProps {
  storeId: Id<"stores">
  category?: {
    _id: Id<"categories">
    name: string
    slug: string
    description?: string
    isActive: boolean
  }
  onSuccess?: () => void
}

export function CategoryForm({ storeId, category, onSuccess }: CategoryFormProps) {
  const createMutation = useMutation(api.categories.create)
  const updateMutation = useMutation(api.categories.update)

  const isEditMode = !!category

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      description: category?.description || "",
      isActive: category?.isActive ?? true,
    },
  })

  // Auto-generate slug from name (only if not in edit mode or slug is empty)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    if (!isEditMode || !category?.slug) {
      // Generate slug: lowercase, replace spaces with hyphens, remove special chars
      const slug = value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")

      setValue("slug", slug)
    }
  }

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditMode) {
        await updateMutation({
          id: category._id,
          name: data.name,
          slug: data.slug,
          description: data.description || undefined,
          isActive: data.isActive,
        })
        toast.success("Catégorie mise à jour avec succès")
      } else {
        // Get the next sort order (max + 1)
        const sortOrder = 0 // This will be handled by the backend

        await createMutation({
          storeId,
          name: data.name,
          slug: data.slug,
          description: data.description || undefined,
          sortOrder,
          isActive: data.isActive,
        })
        toast.success("Catégorie créée avec succès")
      }

      onSuccess?.()
    } catch (error) {
      toast.error(isEditMode ? "Échec de la mise à jour de la catégorie" : "Échec de la création de la catégorie")
      console.error(error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          {...register("name")}
          onChange={(e) => {
            register("name").onChange(e)
            handleNameChange(e)
          }}
          placeholder="ex : Burgers, Desserts, Boissons"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Slug field */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug *</Label>
        <Input
          id="slug"
          {...register("slug")}
          placeholder="Identifiant URL..."
          readOnly={!isEditMode}
          className={!isEditMode ? "bg-muted" : ""}
        />
        <p className="text-xs text-muted-foreground">
          {isEditMode
            ? "Identifiant URL (modifiable)"
            : "Généré automatiquement à partir du nom"}
        </p>
        {errors.slug && (
          <p className="text-sm text-destructive">{errors.slug.message}</p>
        )}
      </div>

      {/* Description field */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Description optionnelle pour cette catégorie"
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Active status switch */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Actif</Label>
          <p className="text-sm text-muted-foreground">
            Les catégories inactives ne seront pas affichées en ligne
          </p>
        </div>
        <Switch
          id="isActive"
          checked={watch("isActive")}
          onCheckedChange={(checked) => setValue("isActive", checked)}
        />
      </div>

      {/* Submit button */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? "Enregistrement..."
            : isEditMode
            ? "Mettre à jour"
            : "Créer la catégorie"}
        </Button>
      </div>
    </form>
  )
}
