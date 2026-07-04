#!/usr/bin/env node
/**
 * Mise à jour TEMPLATE (canal git) — récupère les évolutions structurelles du
 * boilerplate (routes, wrappers convex/, scripts, configs) via un merge git
 * depuis le remote `template`.
 *
 * Usage :
 *   pnpm update:template              # fetch + merge template/main
 *   pnpm update:template -- --dry-run # liste les commits sans merger
 *   pnpm update:template -- --first   # premier sync d'un repo créé via
 *                                     # "Use this template" (historiques
 *                                     # indépendants)
 *
 * Les zones client (site/, site.config.ts, .env*, public/ modifiés) ne sont
 * en conflit que si le template les a touchées — ce qu'il ne fait pas, par
 * contrat (docs/CUSTOMIZATION.md).
 */

import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const DEFAULT_REPO =
  "https://github.com/be-in-digital/beindigital-boilerplate.git"

const args = process.argv.slice(2)
const DRY = args.includes("--dry-run")
const FIRST = args.includes("--first")
const BRANCH = "main"

function sh(command, opts = {}) {
  return execSync(command, { cwd: ROOT, encoding: "utf8", ...opts })
}

function shInherit(command) {
  execSync(command, { cwd: ROOT, stdio: "inherit" })
}

// 1. Arbre propre obligatoire (un merge sur un arbre sale est irrécupérable)
if (sh("git status --porcelain").trim() !== "") {
  console.error(
    "Arbre de travail non propre. Commiter ou stasher avant update:template.",
  )
  process.exit(1)
}

// 2. Remote template
const remotes = sh("git remote").trim().split("\n")
if (!remotes.includes("template")) {
  let url = DEFAULT_REPO
  const sentinel = path.join(ROOT, ".beindigital-site.json")
  if (fs.existsSync(sentinel)) {
    const info = JSON.parse(fs.readFileSync(sentinel, "utf8"))
    if (info.templateRepo) url = info.templateRepo
  }
  shInherit(`git remote add template ${url}`)
  console.log(`Remote template ajouté : ${url}`)
}

console.log("Fetch du template…")
shInherit("git fetch template")

// 3. Quoi de neuf ?
let range = `HEAD..template/${BRANCH}`
let unrelated = false
try {
  sh(`git merge-base HEAD template/${BRANCH}`, {
    stdio: ["pipe", "pipe", "ignore"],
  })
} catch {
  unrelated = true
  range = `template/${BRANCH}`
}

const log = sh(`git log --oneline ${range} | head -50`).trim()
if (!unrelated && log === "") {
  console.log("Déjà à jour avec le template.")
  process.exit(0)
}
console.log(`\nCommits template à intégrer${unrelated ? " (premier sync)" : ""} :`)
console.log(log || "  (historique complet — premier sync)")

if (DRY) process.exit(0)

if (unrelated && !FIRST) {
  console.error(`
Ce repo n'a pas d'ancêtre commun avec le template (créé via "Use this
template" ?). Le premier merge doit être fait explicitement :

  pnpm update:template -- --first

Il fusionnera les deux historiques (--allow-unrelated-histories). Les merges
suivants seront incrémentaux. Alternative recommandée pour les prochains
sites : cloner le boilerplate (git clone) au lieu du bouton template, pour
garder l'historique commun.`)
  process.exit(1)
}

// 4. Merge
try {
  shInherit(
    `git merge template/${BRANCH} --no-edit${unrelated ? " --allow-unrelated-histories" : ""}`,
  )
} catch {
  console.error(`
────────────────────────────────────────────────────────
CONFLITS DE MERGE — guide de résolution :

  Zones ENGINE (app/, components/, lib/, hooks/, cms/, convex/, configs) :
    → prendre la version du template, sauf si vous avez patché sciemment :
      git checkout --theirs <fichier> && git add <fichier>

  Zones CLIENT (site/, site.config.ts, public/, .env*) :
    → garder votre version :
      git checkout --ours <fichier> && git add <fichier>

  Puis : git commit
  Abandonner : git merge --abort
────────────────────────────────────────────────────────`)
  process.exit(1)
}

console.log(`
Merge OK. Étapes suivantes :
  1. pnpm install         # si package.json a changé
  2. pnpm convex:codegen  # si convex/ ou le schéma ont changé
  3. pnpm typecheck && pnpm test
  4. Déployer : pnpm convex:deploy puis déploiement Vercel`)
