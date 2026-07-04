"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { useState } from "react"
import { PlusIcon, LanguagesIcon, StarIcon, TrashIcon } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { LoadingState } from "@/components/admin/LoadingState"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Language {
  _id: Id<"languages">
  code: string
  name: string
  nativeName: string
  flagEmoji?: string
  isDefault: boolean
  isActive: boolean
  isRtl: boolean
}

interface LanguagesContentProps {
  /** When true, hides the page header for embedded usage within tabs */
  embedded?: boolean
}

export function LanguagesContent({ embedded = false }: LanguagesContentProps) {
  const storeId = useAdminStoreId()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [nativeName, setNativeName] = useState("")
  const [flagEmoji, setFlagEmoji] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isRtl, setIsRtl] = useState(false)

  const languages = useQuery(
    api.languages.list,
    storeId ? { storeId } : "skip"
  ) as Language[] | undefined

  const createLanguage = useMutation(api.languages.create)
  const toggleActive = useMutation(api.languages.toggleActive)
  const setDefaultLanguage = useMutation(api.languages.setDefault)
  const removeLanguage = useMutation(api.languages.remove)

  const handleAddLanguage = async () => {
    if (!storeId || !code || !name || !nativeName) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    try {
      await createLanguage({
        storeId,
        code,
        name,
        nativeName,
        flagEmoji: flagEmoji || undefined,
        isDefault,
        isActive: true,
        isRtl,
      })
      toast.success("Langue ajoutée avec succès")
      setIsAddDialogOpen(false)
      // Reset form
      setCode("")
      setName("")
      setNativeName("")
      setFlagEmoji("")
      setIsDefault(false)
      setIsRtl(false)
    } catch (error) {
      toast.error("Échec de l'ajout de la langue")
      console.error(error)
    }
  }

  const handleToggleActive = async (id: Id<"languages">) => {
    try {
      await toggleActive({ id })
      toast.success("Statut de la langue mis à jour")
    } catch (error) {
      toast.error("Échec de la mise à jour du statut")
      console.error(error)
    }
  }

  const handleSetDefault = async (languageId: Id<"languages">) => {
    if (!storeId) return
    try {
      await setDefaultLanguage({ storeId, languageId })
      toast.success("Langue par défaut mise à jour")
    } catch (error) {
      toast.error("Échec de la mise à jour de la langue par défaut")
      console.error(error)
    }
  }

  const handleRemove = async (id: Id<"languages">, isDefaultLang: boolean) => {
    if (isDefaultLang) {
      toast.error("Impossible de supprimer la langue par défaut")
      return
    }
    try {
      await removeLanguage({ id })
      toast.success("Langue supprimée avec succès")
    } catch (error) {
      toast.error("Échec de la suppression de la langue")
      console.error(error)
    }
  }

  if (!storeId) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LanguagesIcon className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun établissement sélectionné</EmptyTitle>
          <EmptyDescription>Veuillez sélectionner un établissement pour gérer les langues</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (languages === undefined) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {!embedded && (
          <div>
            <h1 className="text-3xl font-bold">Langues</h1>
            <p className="text-muted-foreground mt-2">
              Gérez les langues disponibles pour votre établissement
            </p>
          </div>
        )}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className={embedded ? "ml-auto" : ""}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Ajouter une langue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une langue</DialogTitle>
              <DialogDescription>
                Ajoutez une nouvelle langue à votre établissement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code langue *</Label>
                  <Input
                    id="code"
                    placeholder="en, fr, es..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flagEmoji">Drapeau</Label>
                  <Input
                    id="flagEmoji"
                    placeholder="🇬🇧"
                    value={flagEmoji}
                    onChange={(e) => setFlagEmoji(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  placeholder="Anglais"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nativeName">Nom natif *</Label>
                <Input
                  id="nativeName"
                  placeholder="English"
                  value={nativeName}
                  onChange={(e) => setNativeName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isDefault">Définir par défaut</Label>
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="isRtl">Droite à gauche (RTL)</Label>
                <Switch
                  id="isRtl"
                  checked={isRtl}
                  onCheckedChange={setIsRtl}
                />
              </div>
            </div>
            <DialogFooter>
              <ButtonGroup>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddLanguage}>Ajouter une langue</Button>
              </ButtonGroup>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {languages.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LanguagesIcon className="h-5 w-5" />
            </EmptyMedia>
            <EmptyTitle>Aucune langue</EmptyTitle>
            <EmptyDescription>Ajoutez votre première langue pour commencer</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drapeau</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Nom natif</TableHead>
                <TableHead>Défaut</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead>RTL</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {languages.map((language) => (
                <TableRow key={language._id}>
                  <TableCell className="text-2xl">
                    {language.flagEmoji || "🏳️"}
                  </TableCell>
                  <TableCell className="font-mono">{language.code}</TableCell>
                  <TableCell>{language.name}</TableCell>
                  <TableCell>{language.nativeName}</TableCell>
                  <TableCell>
                    {language.isDefault ? (
                      <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(language._id)}
                      >
                        <StarIcon className="h-5 w-5" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={language.isActive}
                      onCheckedChange={() => handleToggleActive(language._id)}
                    />
                  </TableCell>
                  <TableCell>
                    {language.isRtl && <span className="text-xs">RTL</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(language._id, language.isDefault)}
                      disabled={language.isDefault}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
