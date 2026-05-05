#!/usr/bin/env node
/**
 * Post-clone initialization CLI.
 *
 * Asks the developer whether the project needs a mobile app. If not,
 * archives `apps/mobile/` into `.template/mobile/` for later re-use,
 * removes it from the working tree, and updates the README.
 *
 * Idempotent: refuses to run twice via the `.beindigital-init.json`
 * sentinel file (User Advocate #2 + Skeptic #2).
 */
import { existsSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")
const sentinelPath = resolve(repoRoot, ".beindigital-init.json")
const mobilePath = resolve(repoRoot, "apps/mobile")
const templateMobilePath = resolve(repoRoot, ".template/mobile")

async function main() {
  if (existsSync(sentinelPath)) {
    const sentinel = JSON.parse(readFileSync(sentinelPath, "utf8"))
    console.log(
      `Already initialized as ${sentinel.config} on ${sentinel.initializedAt}.`,
    )
    if (sentinel.config === "web-only") {
      console.log("To enable mobile later, run: pnpm add-mobile")
    }
    process.exit(0)
  }

  const rl = createInterface({ input, output })
  const answer = (
    await rl.question(
      "Mobile app? Adds Expo, EAS Build, ~400MB deps.\n" +
        "Can be added later via `pnpm add-mobile`. (y/N) ",
    )
  )
    .trim()
    .toLowerCase()
  rl.close()

  const wantMobile = answer === "y" || answer === "yes"
  const config = wantMobile ? "web-and-mobile" : "web-only"

  if (!wantMobile) {
    if (existsSync(mobilePath)) {
      console.log("Archiving apps/mobile/ to .template/mobile/...")
      cpSync(mobilePath, templateMobilePath, { recursive: true })
      rmSync(mobilePath, { recursive: true, force: true })
    }
  }

  writeFileSync(
    sentinelPath,
    JSON.stringify(
      {
        config,
        initializedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      2,
    ),
  )

  console.log(`\nInitialized as ${config}.`)
  console.log("Next steps:")
  console.log("  1. cp .env.example .env.local  (and fill required vars)")
  console.log("  2. pnpx convex dev             (provisions Convex)")
  console.log("  3. pnpm dev                    (start dev server)")

  // Refresh lockfile for the new shape (web-only or web+mobile)
  console.log("\nUpdating lockfile...")
  const result = spawnSync("pnpm", ["install"], {
    cwd: repoRoot,
    stdio: "inherit",
  })
  if (result.status !== 0) {
    console.warn("\npnpm install exited with a non-zero code. Re-run manually.")
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
