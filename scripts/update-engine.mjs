#!/usr/bin/env node
/**
 * Mise à jour ENGINE (canal npm) — met à jour les packages @be-in-digital/*
 * publiés sur GitHub Packages depuis be-in-digital/beyours.
 *
 * Usage :
 *   pnpm update:engine            # respecte les ranges (^2.x → dernier 2.x)
 *   pnpm update:engine -- --latest  # franchit les majeures (breaking !)
 *   pnpm update:engine -- --check   # affiche les versions sans rien changer
 *
 * Après mise à jour : convex codegen + typecheck + tests, puis liens vers les
 * CHANGELOGs. Nécessite NODE_AUTH_TOKEN (registre privé).
 */

import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const PKG_PATH = path.join(ROOT, "package.json")
const ENGINE_REPO = "https://github.com/be-in-digital/beyours"

const args = process.argv.slice(2)
const LATEST = args.includes("--latest")
const CHECK = args.includes("--check")

function sh(command, opts = {}) {
  return execSync(command, { cwd: ROOT, encoding: "utf8", ...opts })
}

const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"))

if (pkg.pnpm && pkg.pnpm.overrides) {
  const linked = Object.entries(pkg.pnpm.overrides).filter(
    ([k, v]) => k.startsWith("@be-in-digital/") && String(v).startsWith("link:"),
  )
  if (linked.length > 0) {
    console.error(
      "Mode engine-link actif (overrides link:). Lancer `pnpm engine:unlink` avant update:engine.",
    )
    process.exit(1)
  }
}

const engineDeps = Object.keys(pkg.dependencies).filter((d) =>
  d.startsWith("@be-in-digital/"),
)
if (engineDeps.length === 0) {
  console.error("Aucun package @be-in-digital/* dans dependencies.")
  process.exit(1)
}

const before = {}
try {
  for (const dep of engineDeps) {
    before[dep] = sh(`node -p "require('${dep}/package.json').version"`, {
      stdio: ["pipe", "pipe", "ignore"],
    }).trim()
  }
} catch {
  // node_modules absent : les versions "avant" restent celles du manifest
  for (const dep of engineDeps) before[dep] = pkg.dependencies[dep]
}

console.log("Versions installées :")
for (const dep of engineDeps) {
  console.log(`  ${dep}  ${before[dep]}  (range ${pkg.dependencies[dep]})`)
}

let latest = {}
try {
  for (const dep of engineDeps) {
    latest[dep] = sh(`pnpm view ${dep} version`, {
      stdio: ["pipe", "pipe", "ignore"],
    }).trim()
  }
  console.log("\nDernières versions publiées :")
  for (const dep of engineDeps) {
    const mark = latest[dep] !== before[dep] ? "  ← nouveau" : ""
    console.log(`  ${dep}  ${latest[dep]}${mark}`)
  }
} catch {
  console.warn(
    "\n! Impossible d'interroger le registre (NODE_AUTH_TOKEN manquant ?).",
  )
  if (CHECK) process.exit(1)
}

if (CHECK) process.exit(0)

if (LATEST && Object.keys(latest).length > 0) {
  for (const dep of engineDeps) {
    pkg.dependencies[dep] = `^${latest[dep]}`
  }
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n")
  console.log("\nRanges réécrits sur les dernières versions (--latest).")
  sh("pnpm install", { stdio: "inherit", encoding: undefined })
} else {
  console.log("\npnpm update (dans les ranges)…")
  sh(`pnpm update ${engineDeps.join(" ")}`, {
    stdio: "inherit",
    encoding: undefined,
  })
}

console.log("\nVérifications post-update…")
const steps = [
  ["convex codegen", "pnpm convex:codegen"],
  ["typecheck", "pnpm typecheck"],
  ["tests unitaires", "pnpm test"],
]
let failed = false
for (const [label, command] of steps) {
  try {
    console.log(`\n→ ${label}`)
    sh(command, { stdio: "inherit", encoding: undefined })
  } catch {
    failed = true
    console.error(`✗ ${label} en échec`)
  }
}

console.log("\nCHANGELOGs :")
for (const dep of engineDeps) {
  const dir = dep.replace("@be-in-digital/", "")
  console.log(`  ${ENGINE_REPO}/blob/main/packages/${dir}/CHANGELOG.md`)
}

if (failed) {
  console.error(
    "\nDes vérifications ont échoué — corriger avant de commiter la mise à jour.",
  )
  process.exit(1)
}
console.log(
  "\nMise à jour engine OK. Commiter package.json + pnpm-lock.yaml + convex/_generated.",
)
