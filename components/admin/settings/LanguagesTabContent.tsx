"use client"

import { LanguagesContent } from "../languages/LanguagesContent"

/**
 * Wrapper component that embeds LanguagesContent within Settings tabs
 * Renders language management interface without duplicate headers
 */
export function LanguagesTabContent() {
  return <LanguagesContent embedded />
}
