"use client"

import { useEffect } from "react"
import { useCmsPage } from "@/lib/cms/useCmsPage"

/**
 * Injects a dynamic favicon <link> tag from CMS branding data.
 * Falls back to the default /favicon.ico if no CMS favicon is set.
 */
export function DynamicFavicon() {
  const cms = useCmsPage("storefront-layout")
  const faviconUrl = cms.block("branding").field("favicon").mediaUrl

  useEffect(() => {
    if (!faviconUrl) return

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [faviconUrl])

  return null
}
