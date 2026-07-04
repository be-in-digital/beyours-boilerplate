"use client"

import { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAdminStoreId } from "@/lib/admin/hooks"
import { useLanguageStore } from "@be-in-digital/restaurant"
import { LanguageSwitcher } from "@/components/storefront/LanguageSwitcher"

interface LanguageDoc {
  code: string
  name: string
  nativeName: string
  flagEmoji?: string
  isDefault: boolean
  isActive: boolean
}

/**
 * AdminLanguageSwitcher — initializes the language store from Convex
 * and renders the shared LanguageSwitcher component.
 *
 * Used in the admin layout header.
 */
export function AdminLanguageSwitcher() {
  const storeId = useAdminStoreId()

  const languages = useQuery(
    api.languages.listActive,
    storeId ? { storeId } : "skip"
  )

  const initialize = useLanguageStore((state) => state.initialize)

  useEffect(() => {
    if (!languages || languages.length === 0) return

    const typedLangs = languages as LanguageDoc[]
    const defaultLang = typedLangs.find((l) => l.isDefault)
    const defaultCode = defaultLang?.code ?? "fr"

    const storeLanguages = typedLangs.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      flagEmoji: l.flagEmoji,
      isDefault: l.isDefault,
      isActive: l.isActive,
    }))

    initialize(storeLanguages, defaultCode)
  }, [languages, initialize])

  return <LanguageSwitcher />
}
