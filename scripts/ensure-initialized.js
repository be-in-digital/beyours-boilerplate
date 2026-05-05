#!/usr/bin/env node
/**
 * Predev guard. Refuses to start the dev server if `pnpm setup` has
 * not been run yet (User Advocate #2). Without the sentinel, Turborepo
 * may try to build apps/mobile/ even on a web-only clone, producing
 * cryptic Expo errors.
 */
import { existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")
const sentinelPath = resolve(repoRoot, ".beindigital-init.json")

// CI bypasses this check — there is nothing to "initialize" in CI.
if (process.env.CI) {
  process.exit(0)
}

if (existsSync(sentinelPath)) {
  process.exit(0)
}

console.error("")
console.error("\x1b[31m\x1b[1mProject not initialized.\x1b[0m")
console.error("")
console.error("Run \x1b[36mpnpm setup\x1b[0m first to choose between web-only")
console.error("and web+mobile, then `pnpm dev` will work.")
console.error("")
console.error("(Set CI=1 to bypass this check.)")
console.error("")
process.exit(1)
