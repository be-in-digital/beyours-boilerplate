"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { TeamMember } from "@/lib/admin/types"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { PlusIcon, UserIcon, MoreVerticalIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingState } from "@/components/admin/LoadingState"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"

type Role = "manager" | "kitchen" | "waiter" | "delivery"

const roleConfig: Record<Role, { label: string; color: string }> = {
  manager: { label: "Gérant", color: "bg-primary text-primary-foreground" },
  kitchen: { label: "Cuisine", color: "bg-orange-500 text-white" },
  waiter: { label: "Serveur", color: "bg-blue-500 text-white" },
  delivery: { label: "Livreur", color: "bg-green-500 text-white" },
}

export function TeamContent() {
  const storeId = useAdminStoreId()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState<Role>("waiter")
  const [permissions, setPermissions] = useState<string[]>([])

  const teamMembers = useQuery(
    api.teamMembers.list,
    storeId ? { storeId } : "skip"
  ) as TeamMember[] | undefined

  const createMember = useMutation(api.teamMembers.create)
  const toggleActive = useMutation(api.teamMembers.toggleActive)
  const removeMember = useMutation(api.teamMembers.remove)

  const handleAddMember = async () => {
    if (!storeId || !userId || !role) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    try {
      await createMember({
        storeId,
        userId,
        role,
        permissions,
        isActive: true,
      })
      toast.success("Membre ajouté avec succès")
      setIsAddDialogOpen(false)
      setUserId("")
      setRole("waiter")
      setPermissions([])
    } catch (error) {
      toast.error("Échec de l'ajout du membre")
      console.error(error)
    }
  }

  const handleToggleActive = async (id: Id<"teamMembers">) => {
    try {
      await toggleActive({ id })
      toast.success("Statut mis à jour avec succès")
    } catch (error) {
      toast.error("Échec de la mise à jour du statut")
      console.error(error)
    }
  }

  const handleRemoveMember = async (id: Id<"teamMembers">) => {
    try {
      await removeMember({ id })
      toast.success("Membre supprimé avec succès")
    } catch (error) {
      toast.error("Échec de la suppression du membre")
      console.error(error)
    }
  }

  if (!storeId) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UserIcon className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun établissement sélectionné</EmptyTitle>
          <EmptyDescription>Veuillez sélectionner un établissement pour gérer l&apos;équipe</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (teamMembers === undefined) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion de l&apos;équipe</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les comptes du personnel et les permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un membre</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau membre à votre équipe
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">ID utilisateur</Label>
                <Input
                  id="userId"
                  placeholder="Saisir l'ID utilisateur"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gérant</SelectItem>
                    <SelectItem value="kitchen">Cuisine</SelectItem>
                    <SelectItem value="waiter">Serveur</SelectItem>
                    <SelectItem value="delivery">Livreur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <ButtonGroup>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddMember}>Ajouter un membre</Button>
              </ButtonGroup>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {teamMembers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserIcon className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>Aucun membre</EmptyTitle>
            <EmptyDescription>Ajoutez votre premier membre pour commencer</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member: TeamMember) => (
            <div
              key={member._id}
              className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {member.userId?.slice(0, 2).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.userId}</p>
                    <Badge
                      className={cn(
                        "mt-1",
                        roleConfig[member.role as Role]?.color
                      )}
                    >
                      {roleConfig[member.role as Role]?.label || member.role}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleRemoveMember(member._id)}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor={`active-${member._id}`} className="text-sm">
                  Actif
                </Label>
                <Switch
                  id={`active-${member._id}`}
                  checked={member.isActive}
                  onCheckedChange={() => handleToggleActive(member._id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
