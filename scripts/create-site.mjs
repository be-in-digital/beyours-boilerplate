#!/usr/bin/env node
/**
 * Commande one-shot : crée un site client complet (clone + config) en un
 * appel. Auto-suffisante — elle peut tourner depuis un clone du boilerplate
 * OU être pipée sans rien cloner d'avance :
 *
 *   gh api repos/be-in-digital/beyours-boilerplate/contents/scripts/create-site.mjs \
 *     -H "Accept: application/vnd.github.raw" | node --input-type=module - \
 *     client-luigi --name "Chez Luigi" --mobile
 *
 * Usage :
 *   node scripts/create-site.mjs <dossier> [options]
 *
 * Options :
 *   --name "X"            nom du restaurant (défaut : dérivé du dossier)
 *   --description "…"     description SEO
 *   --locale fr           locale par défaut
 *   --mobile | --web      config web + app Expo, ou web seul (défaut)
 *   --template <slug>     template design : pizzeria, fast-food, food-truck,
 *                         poulet, asiatique (défaut : neutre engine)
 *   --repo owner/nom      crée le repo GitHub privé (via gh) et pousse
 *   --template-url URL    boilerplate source (défaut : repo BeYours)
 *   --skip-install        ne pas lancer pnpm install (pas de NODE_AUTH_TOKEN)
 *
 * Étapes : clone du template → remote `template` → (repo GitHub) →
 * pnpm install → pnpm setup --yes → commit initial → (push).
 */

import fs from "node:fs"
import path from "node:path"
import { execSync, spawnSync } from "node:child_process"

const DEFAULT_TEMPLATE =
  "https://github.com/be-in-digital/beyours-boilerplate.git"

const args = process.argv.slice(2)
const positional = args.filter((a, i) => {
  if (a.startsWith("--")) return false
  const prev = args[i - 1]
  return !(
    prev &&
    prev.startsWith("--") &&
    !["--mobile", "--web", "--skip-install"].includes(prev)
  )
})
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : undefined
}

const targetArg = positional[0]
if (!targetArg) {
  console.error(
    "Usage : create-site.mjs <dossier> [--name \"X\"] [--mobile] [--repo owner/nom] …",
  )
  process.exit(1)
}
const target = path.resolve(targetArg)
if (fs.existsSync(target)) {
  console.error(`Le dossier existe déjà : ${target}`)
  process.exit(1)
}

const templateUrl = opt("template-url") || DEFAULT_TEMPLATE
const name =
  opt("name") ||
  path
    .basename(target)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
const repo = opt("repo")

function run(command, opts = {}) {
  execSync(command, { stdio: "inherit", ...opts })
}
function has(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0
}

console.log(`\n① Clone du template → ${target}`)
run(`git clone ${templateUrl} ${JSON.stringify(target)}`)
run("git remote rename origin template", { cwd: target })

let originReady = false
if (repo) {
  console.log(`\n② Repo GitHub ${repo}`)
  if (!has("gh")) {
    console.warn("  ! gh absent — repo non créé. Ajouter origin manuellement.")
  } else {
    const r = spawnSync(
      "gh",
      ["repo", "create", repo, "--private", "--source", target, "--remote", "origin"],
      { stdio: "inherit" },
    )
    originReady = r.status === 0
    if (!originReady)
      console.warn("  ! création du repo échouée — continuer sans origin.")
  }
} else {
  console.log("\n② Pas de --repo : ajouter origin plus tard :")
  console.log("     git remote add origin git@github.com:be-in-digital/<client>.git")
}

console.log("\n③ Installation")
if (flag("skip-install")) {
  console.log("  = sautée (--skip-install)")
} else if (!process.env.NODE_AUTH_TOKEN) {
  console.warn(
    "  ! NODE_AUTH_TOKEN absent — install sautée. Exporter le PAT (read:packages) puis `pnpm install`.",
  )
} else {
  run("pnpm install", { cwd: target })
}

console.log("\n④ Configuration du site")
const setupArgs = ["scripts/init.mjs", "--yes", "--name", name]
const description = opt("description")
const locale = opt("locale")
const template = opt("template")
if (description) setupArgs.push("--description", description)
if (locale) setupArgs.push("--locale", locale)
if (template) setupArgs.push("--template", template)
setupArgs.push(flag("mobile") ? "--mobile" : "--web")
const setup = spawnSync("node", setupArgs, { cwd: target, stdio: "inherit" })
if (setup.status !== 0) process.exit(setup.status || 1)

console.log("\n⑤ Commit initial")
run("git add -A", { cwd: target })
run(
  `git commit -q -m ${JSON.stringify(`chore: init site ${name}`)} --no-verify`,
  { cwd: target },
)
if (originReady) {
  run("git push -q -u origin HEAD", { cwd: target })
  console.log("  ✓ poussé sur origin")
}

console.log(`
────────────────────────────────────────────────────────
Site « ${name} » prêt dans ${target} (${flag("mobile") ? "web + app mobile" : "web"}${template ? `, template ${template}` : ""}).

  cd ${targetArg}
  pnpx convex dev            # provisionne le backend
  pnpm env:setup             # wizard .env (requis + intégrations), puis pnpm convex:env
  pnpm dev                   # storefront + admin${flag("mobile") ? "\n  cd mobile && pnpm install && pnpm start   # app Expo" : ""}

Personnalisation : site.config.ts, site/, public/ (docs/CUSTOMIZATION.md)
Template design  : pnpm template:list / pnpm template:apply <slug>
Mises à jour     : pnpm update:engine / pnpm update:template (docs/UPDATES.md)
────────────────────────────────────────────────────────`)
