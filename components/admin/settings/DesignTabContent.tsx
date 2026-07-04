"use client"

import { DesignContent } from "../design/DesignContent"

/**
 * Wrapper component that embeds DesignContent within Settings tabs
 * Renders design customization interface without duplicate headers
 */
export function DesignTabContent() {
  return <DesignContent embedded />
}
