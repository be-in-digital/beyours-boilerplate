import { checkEnvVars } from "@/lib/env-config"
import { EnvCheckDialog } from "./env-check-dialog"

export function EnvCheck() {
  if (process.env.NODE_ENV !== "development") return null

  const missingVars = checkEnvVars()

  if (missingVars.length === 0) return null

  return <EnvCheckDialog missingVars={missingVars} />
}
