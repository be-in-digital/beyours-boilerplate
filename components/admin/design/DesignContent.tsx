"use client"

import { useState } from "react"
import Image from "next/image"
import { PaletteIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const themes = [
  { id: "fast-food", name: "Fast Food", primary: "#FF6B00", secondary: "#FFF3E0", accent: "#FF9800" },
  { id: "pizzeria", name: "Pizzeria", primary: "#D32F2F", secondary: "#FFEBEE", accent: "#FF5722" },
  { id: "chinese", name: "Chinois", primary: "#C62828", secondary: "#FFF8E1", accent: "#FFD600" },
  { id: "fine-dining", name: "Gastronomie", primary: "#1A237E", secondary: "#E8EAF6", accent: "#9FA8DA" },
  { id: "cafe", name: "Café", primary: "#4E342E", secondary: "#EFEBE9", accent: "#8D6E63" },
  { id: "sushi", name: "Sushi", primary: "#1B5E20", secondary: "#E8F5E9", accent: "#66BB6A" },
]

interface DesignContentProps {
  /** When true, hides the page header for embedded usage within tabs */
  embedded?: boolean
}

export function DesignContent({ embedded = false }: DesignContentProps) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState("#000000")
  const [secondaryColor, setSecondaryColor] = useState("#ffffff")
  const [accentColor, setAccentColor] = useState("#0066cc")
  const [fontHeading, setFontHeading] = useState("Inter")
  const [fontBody, setFontBody] = useState("Inter")
  const [logoUrl, setLogoUrl] = useState("")
  const [faviconUrl, setFaviconUrl] = useState("")

  const handleApplyTheme = (theme: typeof themes[0]) => {
    setSelectedTheme(theme.id)
    setPrimaryColor(theme.primary)
    setSecondaryColor(theme.secondary)
    setAccentColor(theme.accent)
  }

  const handleSaveColors = async () => {
    // Design branding is now managed at the global level
    toast.info("Le design est désormais géré dans les paramètres globaux")
  }

  const handleSaveTypography = async () => {
    toast.info("Le design est désormais géré dans les paramètres globaux")
  }

  const handleSaveLogo = async () => {
    toast.info("Le design est désormais géré dans les paramètres globaux")
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold">Design</h1>
          <p className="text-muted-foreground mt-2">
            Personnalisez l&apos;apparence de votre établissement
          </p>
        </div>
      )}

      <Tabs defaultValue="theme" className="space-y-4">
        <TabsList>
          <TabsTrigger value="theme">Thème</TabsTrigger>
          <TabsTrigger value="colors">Couleurs</TabsTrigger>
          <TabsTrigger value="typography">Typographie</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
        </TabsList>

        <TabsContent value="theme" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={cn(
                  "border rounded-lg p-6 cursor-pointer hover:shadow-md transition-all",
                  selectedTheme === theme.id && "ring-2 ring-primary"
                )}
                onClick={() => handleApplyTheme(theme)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{theme.name}</h3>
                  {selectedTheme === theme.id && (
                    <CheckIcon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className="h-12 rounded border"
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div
                    className="h-12 rounded border"
                    style={{ backgroundColor: theme.secondary }}
                  />
                  <div
                    className="h-12 rounded border"
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p>Primaire : {theme.primary}</p>
                  <p>Secondaire : {theme.secondary}</p>
                  <p>Accent : {theme.accent}</p>
                </div>
              </div>
            ))}
          </div>
          {selectedTheme && (
            <Button onClick={handleSaveColors}>Appliquer le thème sélectionné</Button>
          )}
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur primaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
                <div
                  className="h-20 rounded border"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>
                <div
                  className="h-20 rounded border"
                  style={{ backgroundColor: secondaryColor }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accentColor">Couleur d&apos;accent</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </div>
                <div
                  className="h-20 rounded border"
                  style={{ backgroundColor: accentColor }}
                />
              </div>
            </div>
            <Button onClick={handleSaveColors}>Enregistrer les couleurs</Button>
          </div>
        </TabsContent>

        <TabsContent value="typography" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fontHeading">Police des titres</Label>
                <Input
                  id="fontHeading"
                  value={fontHeading}
                  onChange={(e) => setFontHeading(e.target.value)}
                  placeholder="Inter, Roboto, Arial..."
                />
                <div
                  className="p-4 border rounded text-2xl font-bold"
                  style={{ fontFamily: fontHeading }}
                >
                  Exemple de titre
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontBody">Police du texte</Label>
                <Input
                  id="fontBody"
                  value={fontBody}
                  onChange={(e) => setFontBody(e.target.value)}
                  placeholder="Inter, Roboto, Arial..."
                />
                <div
                  className="p-4 border rounded"
                  style={{ fontFamily: fontBody }}
                >
                  Ceci est un exemple de texte qui montre comment votre contenu
                  apparaîtra avec la police sélectionnée.
                </div>
              </div>
            </div>
            <Button onClick={handleSaveTypography}>Enregistrer la typographie</Button>
          </div>
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL du logo</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                />
                {logoUrl && (
                  <div className="border rounded p-4 flex items-center justify-center bg-muted">
                    <div className="relative w-full h-20">
                      <Image
                        src={logoUrl}
                        alt="Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="faviconUrl">URL du favicon</Label>
                <Input
                  id="faviconUrl"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://..."
                />
                {faviconUrl && (
                  <div className="border rounded p-4 flex items-center justify-center bg-muted">
                    <div className="relative w-8 h-8">
                      <Image
                        src={faviconUrl}
                        alt="Favicon"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleSaveLogo}>Enregistrer le logo</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
