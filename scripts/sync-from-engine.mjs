#!/usr/bin/env node
/**
 * Resynchronise le boilerplate depuis `apps/restaurant-theme` de l'engine
 * (commande MAINTENEUR, à lancer dans le repo boilerplate — jamais sur un
 * site client : les sites se mettent à jour via `pnpm update:template`).
 *
 * Usage :
 *   pnpm sync:engine                       # engine local : ../beyours-engine
 *   pnpm sync:engine -- --engine <chemin>  # autre clone
 *   pnpm sync:engine -- --check            # dry-run : exit 1 si dérive
 *
 * Ce qui est synchronisé (miroir strict, avec suppression) :
 *   app/ components/ lib/ hooks/ cms/ convex/ e2e/ public/
 *   + configs : postcss, playwright, vitest, components.json,
 *     instrumentation.ts, convex.json
 *   + scripts/ de l'app engine (ajout/mise à jour, sans suppression)
 *   + .env.example (avec ré-application du patch d'en-tête)
 *
 * Jamais touché : fichiers PATCHÉS (app/layout.tsx, next.config.ts,
 * eslint.config.mjs, tsconfig.json, package.json), fichiers BOILERPLATE
 * (app/(test)/layout.tsx), zone client (site/, site.config.ts),
 * scripts/*.mjs du boilerplate, docs/, .github/, .template/.
 *
 * Les dépendances ne sont PAS appliquées automatiquement : le script
 * rapporte le diff deps engine↔boilerplate, à réconcilier à la main
 * (les @be-in-digital/* se gèrent via `pnpm update:engine`).
 */

import fs from "node:fs"
import path from "node:path"
import { execSync, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const args = process.argv.slice(2)
const CHECK = args.includes("--check")
const engineIdx = args.indexOf("--engine")
const ENGINE = path.resolve(
  engineIdx !== -1 && args[engineIdx + 1]
    ? args[engineIdx + 1]
    : process.env.BID_ENGINE_PATH || path.join(ROOT, "..", "beyours-engine"),
)
const APP = path.join(ENGINE, "apps", "restaurant-theme")

if (!fs.existsSync(path.join(APP, "package.json"))) {
  console.error(`App engine introuvable : ${APP}
Cloner l'engine (git clone https://github.com/be-in-digital/beyours-engine)
puis relancer avec --engine <chemin> ou BID_ENGINE_PATH.`)
  process.exit(1)
}

const SYNC_DIRS = ["app", "components", "lib", "hooks", "cms", "convex", "e2e", "public"]
/** Protégés à l'intérieur des dossiers synchronisés (chemins rsync ancrés). */
const PROTECTED = {
  app: ["/layout.tsx", "/(test)/layout.tsx"],
}
const SYNC_FILES = [
  "postcss.config.mjs",
  "playwright.config.ts",
  "vitest.config.ts",
  "components.json",
  "instrumentation.ts",
  "convex.json",
]

const dry = CHECK ? "--dry-run" : ""
let changes = []

function rsync(from, to, { del = true, excludes = [] } = {}) {
  const ex = excludes.map((e) => `--exclude=${JSON.stringify(e)}`).join(" ")
  const out = execSync(
    // --checksum : ne compter/copier que les VRAIS diffs de contenu (sur un
    // clone frais, les mtimes divergent et rsync recopierait tout le miroir)
    `rsync -aic ${dry} ${del ? "--delete" : ""} ${ex} --exclude=.DS_Store ${JSON.stringify(from + "/")} ${JSON.stringify(to + "/")}`,
    { encoding: "utf8" },
  )
  // Ignorer les mises à jour d'attributs seuls (préfixe ".") : avec
  // --checksum, ".f..t...." = contenu identique, seul le mtime diffère.
  const lines = out.split("\n").filter((l) => l.trim() && !l.startsWith("."))
  changes.push(...lines.map((l) => `${path.basename(to)}: ${l}`))
}

console.log(`Resync depuis ${APP}${CHECK ? " (dry-run)" : ""}\n`)

// 1. Dossiers miroir
for (const dir of SYNC_DIRS) {
  rsync(path.join(APP, dir), path.join(ROOT, dir), {
    del: true,
    excludes: PROTECTED[dir] || [],
  })
}

// 2. Scripts de l'app engine (sans suppression : scripts/*.mjs = boilerplate)
if (fs.existsSync(path.join(APP, "scripts"))) {
  rsync(path.join(APP, "scripts"), path.join(ROOT, "scripts"), { del: false })
}

// 3. Fichiers de config
for (const file of SYNC_FILES) {
  const from = path.join(APP, file)
  if (!fs.existsSync(from)) continue
  const to = path.join(ROOT, file)
  const differs =
    !fs.existsSync(to) ||
    !fs.readFileSync(from).equals(fs.readFileSync(to))
  if (differs) {
    changes.push(`config: ${file}`)
    if (!CHECK) fs.copyFileSync(from, to)
  }
}

// 4. .env.example : sync + ré-application du patch d'en-tête boilerplate
{
  const from = path.join(APP, ".env.example")
  const to = path.join(ROOT, ".env.example")
  if (fs.existsSync(from)) {
    let content = fs.readFileSync(from, "utf8")
    content = content.replace(
      /^#   cp .*$/m,
      "#   cp .env.example .env.local        (fait automatiquement par `pnpm setup`)",
    )
    content = content.replace(
      "packages/core/src/env/schemas.ts",
      "@be-in-digital/core src/env/schemas.ts",
    )
    if (!fs.existsSync(to) || fs.readFileSync(to, "utf8") !== content) {
      changes.push("config: .env.example (header re-patché)")
      if (!CHECK) fs.writeFileSync(to, content)
    }
  }
}

// 5. Rapport deps (jamais auto-appliqué)
{
  const enginePkg = JSON.parse(fs.readFileSync(path.join(APP, "package.json"), "utf8"))
  const ourPkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"))
  const report = []
  for (const section of ["dependencies", "devDependencies"]) {
    const theirs = enginePkg[section] || {}
    const ours = ourPkg[section] || {}
    for (const [dep, range] of Object.entries(theirs)) {
      if (dep.startsWith("@be-in-digital/")) continue // géré par update:engine
      if (!(dep in ours)) report.push(`  + ${dep}@${range} (${section}) — à AJOUTER`)
      else if (
        ours[dep] !== range &&
        range !== "workspace:^" &&
        range !== "workspace:*" &&
        // pins exacts boilerplate assumés (types React alignés sur le lock engine)
        !["@types/react", "@types/react-dom"].includes(dep)
      )
        report.push(`  ~ ${dep} : engine ${range} / boilerplate ${ours[dep]}`)
    }
    for (const dep of Object.keys(ours)) {
      if (dep.startsWith("@be-in-digital/")) continue
      if (["tsx", "@vitest/coverage-v8"].includes(dep)) continue // ajouts boilerplate assumés
      if (!(dep in theirs)) report.push(`  - ${dep} (${section}) — absent de l'engine`)
    }
  }
  if (report.length) {
    console.log("Dépendances à réconcilier manuellement :")
    console.log(report.join("\n") + "\n")
  }
}

// 6. Marqueur d'état de sync
const engineCommit = execSync("git rev-parse HEAD", { cwd: ENGINE, encoding: "utf8" }).trim()
const engineDate = execSync("git log -1 --format=%cI", { cwd: ENGINE, encoding: "utf8" }).trim()
if (!CHECK) {
  fs.writeFileSync(
    path.join(ROOT, ".engine-sync.json"),
    JSON.stringify({ engineCommit, engineDate, syncedAt: new Date().toISOString() }, null, 2) + "\n",
  )
}

// 7. Bilan
if (changes.length === 0) {
  console.log(`Aucune dérive — miroir aligné sur l'engine @ ${engineCommit.slice(0, 7)}.`)
  process.exit(0)
}
console.log(`${changes.length} changement(s)${CHECK ? " détecté(s) (dry-run)" : " appliqué(s)"} :`)
console.log(changes.slice(0, 30).map((c) => "  " + c).join("\n"))
if (changes.length > 30) console.log(`  … et ${changes.length - 30} autres`)

if (CHECK) process.exit(1)

console.log(`
Étapes suivantes :
  1. git diff --stat                      # relire
  2. pnpm engine:link ${path.relative(ROOT, ENGINE)} && pnpm typecheck && pnpm test && pnpm build
  3. pnpm engine:unlink
  4. Committer (les sites récupéreront via pnpm update:template)`)
