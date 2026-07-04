"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { toast } from "sonner"
import { useState } from "react"
import { GamepadIcon, PlusIcon, QrCodeIcon, GiftIcon, TrashIcon } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { LoadingState } from "@/components/admin/LoadingState"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Badge } from "@/components/ui/badge"

interface Game {
  _id: Id<"games">
  name: string
  type: "wheel" | "scratch_card"
  description?: string
  winRatio: number
  isActive: boolean
}

interface QRCode {
  _id: Id<"gameQRCodes">
  code: string
  tableNumber?: string
  location?: string
  isActive: boolean
}

interface Prize {
  _id: Id<"prizes">
  name: string
  description?: string
  type: string
  value?: number
  validityDays: number
  totalAvailable?: number
  isActive: boolean
}

export function GamesContent() {
  const storeId = useAdminStoreId()
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const [isAddQROpen, setIsAddQROpen] = useState(false)
  const [isAddPrizeOpen, setIsAddPrizeOpen] = useState(false)

  // Game form state
  const [gameName, setGameName] = useState("")
  const [gameType, setGameType] = useState<"wheel" | "scratch_card">("wheel")
  const [gameDescription, setGameDescription] = useState("")
  const [winRatio, setWinRatio] = useState(30)

  // QR Code form state
  const [qrCode, setQrCode] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const [location, setLocation] = useState("")

  // Prize form state
  const [prizeName, setPrizeName] = useState("")
  const [prizeDescription, setPrizeDescription] = useState("")
  const [prizeType, setPrizeType] = useState<"discount_percentage" | "discount_fixed" | "free_product" | "free_menu" | "custom">("discount_percentage")
  const [prizeValue, setPrizeValue] = useState("")
  const [validityDays, setValidityDays] = useState("7")
  const [totalAvailable, setTotalAvailable] = useState("")

  const games = useQuery(api.games.list, storeId ? { storeId } : "skip") as Game[] | undefined
  const qrCodes = useQuery(api.gameQRCodes.list, storeId ? { storeId } : "skip") as QRCode[] | undefined
  const prizes = useQuery(api.prizes.list, storeId ? { storeId } : "skip") as Prize[] | undefined

  const createGame = useMutation(api.games.create)
  const updateWinRatio = useMutation(api.games.updateWinRatio)
  const removeGame = useMutation(api.games.remove)

  const createQRCode = useMutation(api.gameQRCodes.create)
  const removeQRCode = useMutation(api.gameQRCodes.remove)

  const createPrize = useMutation(api.prizes.create)
  const removePrize = useMutation(api.prizes.remove)

  const generateQRCode = () => {
    // Generate random code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    setQrCode(code)
  }

  const handleAddGame = async () => {
    if (!storeId || !gameName) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    try {
      await createGame({
        storeId,
        type: gameType,
        name: gameName,
        description: gameDescription || undefined,
        winRatio,
        isActive: true,
      })
      toast.success("Jeu créé avec succès")
      setIsAddGameOpen(false)
      setGameName("")
      setGameDescription("")
      setWinRatio(30)
    } catch (error) {
      toast.error("Échec de la création du jeu")
      console.error(error)
    }
  }

  const handleUpdateWinRatio = async (gameId: Id<"games">, newRatio: number) => {
    try {
      await updateWinRatio({ id: gameId, winRatio: newRatio })
      toast.success("Ratio de victoire mis à jour")
    } catch (error) {
      toast.error("Échec de la mise à jour du ratio")
      console.error(error)
    }
  }

  const handleAddQRCode = async () => {
    if (!storeId || !qrCode) {
      toast.error("Veuillez générer un code QR")
      return
    }

    try {
      await createQRCode({
        storeId,
        code: qrCode,
        tableNumber: tableNumber || undefined,
        location: location || undefined,
        isActive: true,
      })
      toast.success("Code QR créé avec succès")
      setIsAddQROpen(false)
      setQrCode("")
      setTableNumber("")
      setLocation("")
    } catch (error) {
      toast.error("Échec de la création du code QR")
      console.error(error)
    }
  }

  const handleAddPrize = async () => {
    if (!storeId || !prizeName) {
      toast.error("Veuillez remplir tous les champs requis")
      return
    }

    try {
      await createPrize({
        storeId,
        name: prizeName,
        description: prizeDescription || undefined,
        type: prizeType,
        value: prizeValue ? parseInt(prizeValue) : undefined,
        validityDays: parseInt(validityDays),
        totalAvailable: totalAvailable ? parseInt(totalAvailable) : undefined,
        isActive: true,
      })
      toast.success("Prix créé avec succès")
      setIsAddPrizeOpen(false)
      setPrizeName("")
      setPrizeDescription("")
      setPrizeValue("")
      setValidityDays("7")
      setTotalAvailable("")
    } catch (error) {
      toast.error("Échec de la création du prix")
      console.error(error)
    }
  }

  if (!storeId) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GamepadIcon className="h-5 w-5" />
          </EmptyMedia>
          <EmptyTitle>Aucun établissement sélectionné</EmptyTitle>
          <EmptyDescription>Veuillez sélectionner un établissement pour gérer les jeux</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (games === undefined || qrCodes === undefined || prizes === undefined) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jeux et Gamification</h1>
        <p className="text-muted-foreground mt-2">
          Engagez vos clients avec des jeux interactifs
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="qrcodes">Codes QR</TabsTrigger>
          <TabsTrigger value="prizes">Prix</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddGameOpen} onOpenChange={setIsAddGameOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Créer un jeu
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau jeu</DialogTitle>
                  <DialogDescription>
                    Configurez un nouveau jeu pour vos clients
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gameName">Nom du jeu *</Label>
                    <Input
                      id="gameName"
                      placeholder="Tournez et gagnez"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gameType">Type de jeu *</Label>
                    <Select value={gameType} onValueChange={(v) => setGameType(v as "wheel" | "scratch_card")}>
                      <SelectTrigger id="gameType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wheel">Roue de la fortune</SelectItem>
                        <SelectItem value="scratch_card">Carte à gratter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gameDescription">Description</Label>
                    <Input
                      id="gameDescription"
                      placeholder="Description optionnelle"
                      value={gameDescription}
                      onChange={(e) => setGameDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="winRatio">Ratio de victoire : {winRatio}%</Label>
                    <Slider
                      id="winRatio"
                      min={0}
                      max={100}
                      step={5}
                      value={[winRatio]}
                      onValueChange={(v) => setWinRatio(v[0] ?? 30)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pourcentage de parties gagnantes
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <ButtonGroup>
                    <Button variant="outline" onClick={() => setIsAddGameOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddGame}>Créer un jeu</Button>
                  </ButtonGroup>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {games.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GamepadIcon className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun jeu</EmptyTitle>
                <EmptyDescription>Créez votre premier jeu pour commencer</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {games.map((game) => (
                <div key={game._id} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{game.name}</h3>
                      <Badge className="mt-2">
                        {game.type === "wheel" ? "Roue de la fortune" : "Carte à gratter"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGame({ id: game._id })}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  {game.description && (
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                  )}
                  <div className="space-y-2">
                    <Label>Ratio de victoire : {game.winRatio}%</Label>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[game.winRatio]}
                      onValueChange={(v) => handleUpdateWinRatio(game._id, v[0] ?? 0)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="qrcodes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddQROpen} onOpenChange={setIsAddQROpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Créer un code QR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un code QR</DialogTitle>
                  <DialogDescription>
                    Générez un code QR pour une table ou un emplacement
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qrCode">Code QR *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="qrCode"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        placeholder="Auto-généré"
                      />
                      <Button type="button" onClick={generateQRCode}>
                        Générer
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tableNumber">Numéro de table</Label>
                    <Input
                      id="tableNumber"
                      placeholder="12"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Emplacement</Label>
                    <Input
                      id="location"
                      placeholder="Salle principale"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <ButtonGroup>
                    <Button variant="outline" onClick={() => setIsAddQROpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddQRCode}>Créer un code QR</Button>
                  </ButtonGroup>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {qrCodes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <QrCodeIcon className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun code QR</EmptyTitle>
                <EmptyDescription>Créez des codes QR pour vos tables</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {qrCodes.map((qr) => (
                <div key={qr._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <QrCodeIcon className="h-8 w-8" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQRCode({ id: qr._id })}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="font-mono text-sm font-semibold">{qr.code}</p>
                  {qr.tableNumber && (
                    <p className="text-sm text-muted-foreground">
                      Table {qr.tableNumber}
                    </p>
                  )}
                  {qr.location && (
                    <p className="text-xs text-muted-foreground">{qr.location}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prizes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddPrizeOpen} onOpenChange={setIsAddPrizeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Créer un prix
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un prix</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau prix que les clients peuvent gagner
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prizeName">Nom du prix *</Label>
                    <Input
                      id="prizeName"
                      placeholder="10% de réduction"
                      value={prizeName}
                      onChange={(e) => setPrizeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prizeType">Type *</Label>
                    <Select value={prizeType} onValueChange={(v) => setPrizeType(v as typeof prizeType)}>
                      <SelectTrigger id="prizeType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount_percentage">Réduction %</SelectItem>
                        <SelectItem value="discount_fixed">Réduction fixe</SelectItem>
                        <SelectItem value="free_product">Produit offert</SelectItem>
                        <SelectItem value="free_menu">Menu offert</SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prizeValue">Valeur (optionnelle)</Label>
                    <Input
                      id="prizeValue"
                      type="number"
                      placeholder="10"
                      value={prizeValue}
                      onChange={(e) => setPrizeValue(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validityDays">Validité (jours) *</Label>
                      <Input
                        id="validityDays"
                        type="number"
                        value={validityDays}
                        onChange={(e) => setValidityDays(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalAvailable">Quantité disponible</Label>
                      <Input
                        id="totalAvailable"
                        type="number"
                        placeholder="Illimité"
                        value={totalAvailable}
                        onChange={(e) => setTotalAvailable(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prizeDescription">Description</Label>
                    <Input
                      id="prizeDescription"
                      placeholder="Description optionnelle"
                      value={prizeDescription}
                      onChange={(e) => setPrizeDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <ButtonGroup>
                    <Button variant="outline" onClick={() => setIsAddPrizeOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddPrize}>Créer un prix</Button>
                  </ButtonGroup>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {prizes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GiftIcon className="h-5 w-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun prix</EmptyTitle>
                <EmptyDescription>Créez des prix que les clients peuvent gagner</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {prizes.map((prize) => (
                <div key={prize._id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <GiftIcon className="h-6 w-6" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePrize({ id: prize._id })}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="font-semibold">{prize.name}</h3>
                  <Badge>{prize.type.replace("_", " ")}</Badge>
                  {prize.description && (
                    <p className="text-sm text-muted-foreground">{prize.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Valide {prize.validityDays} jours
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GamepadIcon className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle>Aucun historique</EmptyTitle>
              <EmptyDescription>L&apos;historique des parties apparaîtra ici</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      </Tabs>
    </div>
  )
}
