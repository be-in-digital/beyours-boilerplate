"use client"

import Link from "next/link"
import Image from "next/image"
import { useMutation } from "convex/react"
import { MoreVertical, Edit, Trash2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { formatPrice } from "@/lib/admin/formatters"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DeleteConfirmDialog } from "../DeleteConfirmDialog"
import { useState } from "react"

interface Product {
  _id: Id<"products">
  name: string
  description?: string
  categoryId: Id<"categories">
  price: number
  images: string[]
  stock?: {
    tracked: boolean
    quantity: number
    lowStockThreshold: number
  }
  isActive: boolean
  isFeatured: boolean
}

interface Category {
  _id: Id<"categories">
  name: string
}

interface ProductsTableProps {
  products: Product[]
  categories: Category[]
}

export function ProductsTable({ products, categories }: ProductsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Id<"products"> | null>(null)

  const toggleStatus = useMutation(api.products.toggleStatus)
  const removeProduct = useMutation(api.products.remove)

  const getCategoryName = (categoryId: Id<"categories">) => {
    return categories.find((cat) => cat._id === categoryId)?.name || "Inconnu"
  }

  const handleToggleStatus = async (productId: Id<"products">) => {
    try {
      await toggleStatus({ id: productId })
      toast.success("Statut du produit mis à jour")
    } catch (error) {
      toast.error("Échec de la mise à jour du statut")
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!productToDelete) return

    try {
      await removeProduct({ id: productToDelete })
      toast.success("Produit supprimé avec succès")
      setDeleteDialogOpen(false)
      setProductToDelete(null)
    } catch (error) {
      toast.error("Échec de la suppression du produit")
      console.error(error)
    }
  }

  const openDeleteDialog = (productId: Id<"products">) => {
    setProductToDelete(productId)
    setDeleteDialogOpen(true)
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">Aucun produit à afficher</p>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  {/* Image */}
                  <TableCell>
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted">
                      {product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                          Sans image
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Name + Description */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </div>
                      )}
                      {product.isFeatured && (
                        <Badge variant="secondary" className="text-xs">
                          En vedette
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Badge variant="outline">
                      {getCategoryName(product.categoryId)}
                    </Badge>
                  </TableCell>

                  {/* Price */}
                  <TableCell className="font-medium">
                    {formatPrice(product.price)}
                  </TableCell>

                  {/* Stock */}
                  <TableCell>
                    {product.stock?.tracked ? (
                      <div className="text-sm">
                        <div>{product.stock.quantity} unités</div>
                        {product.stock.quantity <= product.stock.lowStockThreshold && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Stock faible
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Non suivi
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/products/${product._id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(product._id)}
                        >
                          {product.isActive ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Activer
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(product._id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        description="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
      />
    </>
  )
}
