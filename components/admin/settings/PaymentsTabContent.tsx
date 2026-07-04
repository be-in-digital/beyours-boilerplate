"use client"

import { PaymentsContent } from "../payments/PaymentsContent"

/**
 * Wrapper component that embeds PaymentsContent within Settings tabs
 * Renders payment management interface without duplicate headers
 */
export function PaymentsTabContent() {
  return <PaymentsContent embedded />
}
