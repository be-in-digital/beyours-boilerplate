#!/usr/bin/env node
/**
 * Wrapper that runs `convex codegen` from the repo root regardless of
 * the cwd. Apps under `apps/*` use this in their predev/prebuild hooks
 * so that the generated artifacts in `convex/_generated/` are always
 * up-to-date before Next.js or Expo bundlers consume them via
 * `@repo/backend`.
 *
 * Constraint Guardian #5: codegen must be enforced; if it has never
 * run, the build fails with a clear message rather than a cryptic
 * TS2307 in app code.
 */
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { existsSync } from "node:fs"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..")

if (!existsSync(resolve(repoRoot, "convex"))) {
  console.error(
    "convex/ directory not found at repo root. Run from a clean checkout.",
  )
  process.exit(1)
}

const result = spawnSync("pnpx", ["convex", "codegen"], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
