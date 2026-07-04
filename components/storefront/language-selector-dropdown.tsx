"use client"

import { useState } from "react"
import { Globe } from "lucide-react"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@be-in-digital/ui/components"
import {
  setLocale as persistLocale,
  getLocaleFromLocalStorage,
  COMMON_LANGUAGES,
  type LanguageConfig,
} from "@be-in-digital/core"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Language } from "@/lib/admin/types"

export function LanguageSelectorDropdown({
  variant = "solid",
}: {
  variant?: "transparent" | "solid"
}) {
  const languages = useQuery(api.languages.listAll)

  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof window !== "undefined") {
      return getLocaleFromLocalStorage() ?? "fr"
    }
    return "fr"
  })

  const activeLanguages: Language[] = languages ?? []

  // Don't render if 0 or 1 language
  if (activeLanguages.length <= 1) return null

  function handleChange(code: string) {
    setCurrentLocale(code)
    persistLocale(code)
    window.location.reload()
  }

  const currentLang =
    activeLanguages.find((l) => l.code === currentLocale) ??
    activeLanguages.find((l) => l.isDefault) ??
    activeLanguages[0]

  const fallbackConfig = (code: string): LanguageConfig | undefined =>
    COMMON_LANGUAGES.find((l) => l.code === code)

  const isTransparent = variant === "transparent"
  const tooltipLabel = currentLang?.nativeName ?? "Langue"

  return (
    <Popover>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 ${
                  isTransparent
                    ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
                    : "bg-white border-zinc-100 shadow-sm text-[#0D5C3F] hover:bg-zinc-50"
                }`}
                aria-label={tooltipLabel}
              >
                <Globe className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 p-2 rounded-2xl border border-zinc-100 bg-white shadow-xl"
      >
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 px-3 pt-2 pb-3">
          Langue
        </h3>

        <div className="flex flex-col gap-1">
          {activeLanguages.map((lang) => {
            const isSelected = lang.code === currentLocale
            const flag = lang.flagEmoji ?? fallbackConfig(lang.code)?.flagEmoji

            return (
              <button
                key={lang._id}
                type="button"
                onClick={() => handleChange(lang.code)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${
                  isSelected
                    ? "bg-[#0D5C3F]/10 border border-[#0D5C3F]/20"
                    : "hover:bg-zinc-50 border border-transparent"
                }`}
              >
                {flag && <span className="text-base">{flag}</span>}
                <span className="text-sm font-bold text-zinc-900">
                  {lang.nativeName}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
