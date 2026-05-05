import { checkEnvVars } from "@/lib/env-config"
import { EnvCheckDialog } from "./env-check-dialog"

export function EnvCheck() {
  if (process.env.NODE_ENV !== "development") return null
  // Skip in E2E test runs — the modal intercepts clicks and breaks Playwright.
  if (process.env.NEXT_PUBLIC_E2E === "1") return null

  const missingVars = checkEnvVars()
  // Only block UI when REQUIRED vars are missing. Optional vars (Google Maps,
  // Sentry, Stripe) are listed elsewhere and shouldn't gate the dev UI.
  const blockingVars = missingVars.filter((v) => v.required)

  if (blockingVars.length === 0) return null

  return <EnvCheckDialog missingVars={blockingVars} />
}
