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

// Convex codegen requires CONVEX_DEPLOYMENT to fetch component types from
// the backend. In CI there is no deployment configured, so we fall back
// to the `_generated/` files committed to the repo — they are the
// authoritative source for type-checking and bundling.
//
// The fail-fast contract (Constraint Guardian #5) is satisfied at dev
// time, when developers naturally have CONVEX_DEPLOYMENT set in their
// .env.local. CI just trusts the committed artifacts.
if (!process.env.CONVEX_DEPLOYMENT && process.env.CI) {
  console.log(
    "[convex-codegen] CI detected without CONVEX_DEPLOYMENT — skipping codegen, using committed convex/_generated/.",
  )
  process.exit(0)
}

const result = spawnSync("pnpx", ["convex", "codegen"], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
})

process.exit(result.status ?? 1)
