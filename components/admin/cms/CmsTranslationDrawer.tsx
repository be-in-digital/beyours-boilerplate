"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminStoreId } from "@/lib/admin/hooks"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Input,
  Label,
  Badge,
  Textarea,
} from "@be-in-digital/ui"
import type { FieldDefinition } from "@be-in-digital/cms"

interface TranslationEntry {
  value: string
  isAutoTranslated: boolean
}

interface CmsTranslationDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fieldKey: string
  fieldDef: FieldDefinition
  sourceValue: string
  translations: Record<string, TranslationEntry>
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim()
}

export function CmsTranslationDrawer({
  open,
  onOpenChange,
  fieldKey,
  fieldDef,
  sourceValue,
  translations,
}: CmsTranslationDrawerProps) {
  const storeId = useAdminStoreId()

  const languages = useQuery(
    api.languages.list,
    storeId ? { storeId } : "skip",
  )

  const activeLanguages =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    languages?.filter((l: any) => l.isActive && !l.isDefault) ?? []

  const displaySource =
    fieldDef.type === "richtext" ? stripHtml(sourceValue) : sourceValue

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Traductions — {fieldDef.label}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6 px-6">
          {/* Source (default language, read-only) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Langue par défaut</Label>
              <Badge variant="outline" className="text-[10px]">
                Source
              </Badge>
            </div>
            {fieldDef.type === "richtext" ? (
              <Textarea
                value={displaySource || "Vide"}
                readOnly
                rows={3}
                className="bg-muted/20 text-sm"
              />
            ) : (
              <Input
                value={displaySource || "Vide"}
                readOnly
                className="bg-muted/20"
              />
            )}
          </div>

          {/* Translations per language */}
          {activeLanguages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune langue secondaire active. Ajoutez des langues dans les
              paramètres.
            </p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            activeLanguages.map((lang: any) => {
              const translation = translations[lang.code]
              const hasTranslation = !!translation?.value
              const isAuto = translation?.isAutoTranslated ?? false

              return (
                <div key={lang.code} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      {lang.flagEmoji && (
                        <span className="mr-1">{lang.flagEmoji}</span>
                      )}
                      {lang.nativeName}
                    </Label>
                    {hasTranslation ? (
                      <Badge
                        variant={isAuto ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {isAuto ? "Auto" : "Manuel"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground"
                      >
                        Non traduit
                      </Badge>
                    )}
                  </div>
                  {fieldDef.type === "richtext" ? (
                    <Textarea
                      value={translation?.value ?? ""}
                      readOnly
                      rows={3}
                      placeholder="En attente de traduction..."
                      className="text-sm"
                    />
                  ) : (
                    <Input
                      value={translation?.value ?? ""}
                      readOnly
                      placeholder="En attente de traduction..."
                      className="text-sm"
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
