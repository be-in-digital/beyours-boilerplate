#!/usr/bin/env node
/**
 * Re-enables the mobile app on a project that was originally
 * initialized as web-only. Restores `.template/mobile/` into
 * `apps/mobile/` and updates the sentinel.
 *
 * Refuses to run if `apps/mobile/` already exists (Skeptic #2 +
 * User Advocate #10).
 */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  cpSync,
  statSync,
} from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")
const sentinelPath = resolve(repoRoot, ".beindigital-init.json")
const mobilePath = resolve(repoRoot, "apps/mobile")
const templateMobilePath = resolve(repoRoot, ".template/mobile")

if (existsSync(mobilePath)) {
  console.error("apps/mobile/ already exists. Mobile is already enabled.")
  process.exit(1)
}

if (!existsSync(templateMobilePath)) {
  console.error(
    ".template/mobile/ not found. The boilerplate seems corrupted —\n" +
      "fetch a fresh copy of .template/mobile/ from the upstream template.",
  )
  process.exit(1)
}

// Snapshot rot warning (Skeptic #9): if .template/mobile is older than
// 6 months, the Expo SDK / RN versions are likely stale.
const stat = statSync(templateMobilePath)
const ageDays =
  (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24)
if (ageDays > 180) {
  console.warn(
    `Warning: .template/mobile/ is ${Math.round(ageDays)} days old.\n` +
      "Expo SDK and React Native may be behind current. Plan an upgrade.",
  )
}

console.log("Restoring apps/mobile/ from .template/mobile/...")
cpSync(templateMobilePath, mobilePath, { recursive: true })

if (existsSync(sentinelPath)) {
  const sentinel = JSON.parse(readFileSync(sentinelPath, "utf8"))
  sentinel.config = "web-and-mobile"
  sentinel.mobileAddedAt = new Date().toISOString().slice(0, 10)
  writeFileSync(sentinelPath, JSON.stringify(sentinel, null, 2))
}

console.log("Mobile enabled. Updating lockfile...")
const result = spawnSync("pnpm", ["install"], {
  cwd: repoRoot,
  stdio: "inherit",
})

console.log("\nNext steps:")
console.log("  1. Configure EAS: cp eas.json.template eas.json (if not yet)")
console.log("  2. Set EAS secret: eas secret:create --scope project \\")
console.log("       --name NODE_AUTH_TOKEN --value <your_PAT>")
console.log("  3. Start dev: pnpm --filter mobile start")

process.exit(result.status ?? 0)
