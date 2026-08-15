#!/usr/bin/env node
/**
 * Mode développement : consommer les packages @be-in-digital/* depuis un
 * clone local de beyours-engine (symlinks pnpm) au lieu du registre
 * GitHub Packages. Utile pour :
 *   - développer engine + site en parallèle sans publier ;
 *   - valider le boilerplate sans NODE_AUTH_TOKEN.
 *
 * Usage :
 *   node scripts/engine-link.js link [chemin-du-clone-engine]
 *   node scripts/engine-link.js unlink
 *
 * Le chemin par défaut vient de BID_ENGINE_PATH, sinon ../beyours-engine.
 * ATTENTION : ne jamais commiter package.json/pnpm-lock.yaml en mode link
 * (des overrides `link:` y figurent). `unlink` nettoie les deux.
 */

import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const PKG_PATH = path.join(ROOT, "package.json")

const cmd = process.argv[2]
const engineArg = process.argv[3]

function run(command, opts = {}) {
  execSync(command, { stdio: "inherit", cwd: ROOT, ...opts })
}

function readPkg() {
  return JSON.parse(fs.readFileSync(PKG_PATH, "utf8"))
}

function writePkg(pkg) {
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n")
}

function link() {
  const enginePath = path.resolve(
    engineArg || process.env.BID_ENGINE_PATH || path.join(ROOT, "..", "beyours-engine"),
  )
  const packagesDir = path.join(enginePath, "packages")
  if (!fs.existsSync(path.join(packagesDir, "core", "package.json"))) {
    console.error(`Clone engine introuvable : ${packagesDir}`)
    console.error(
      "git clone https://github.com/be-in-digital/beyours-engine puis relancer avec le chemin en argument ou BID_ENGINE_PATH.",
    )
    process.exit(1)
  }

  // Les packages engine s'importent entre eux (workspace:*). En mode link,
  // leurs imports se résolvent dans le clone — le clone doit donc être
  // installé.
  if (!fs.existsSync(path.join(enginePath, "node_modules"))) {
    console.log(`Installation du clone engine (${enginePath})…`)
    run("pnpm install", { cwd: enginePath })
  }

  // Une partie des packages est publiée buildée (exports → dist/) : sur le
  // registre le dist est produit au publish, dans un clone brut il manque.
  // On builde tout package qui déclare un script build sans avoir son dist.
  const needBuild = fs.readdirSync(packagesDir).some((dir) => {
    const pkgJson = path.join(packagesDir, dir, "package.json")
    if (!fs.existsSync(pkgJson)) return false
    const j = JSON.parse(fs.readFileSync(pkgJson, "utf8"))
    return (
      j.scripts &&
      j.scripts.build &&
      !fs.existsSync(path.join(packagesDir, dir, "dist"))
    )
  })
  if (needBuild) {
    console.log("Build des packages engine (dist/ manquants)…")
    run('pnpm -r --filter "./packages/**" run build', { cwd: enginePath })
  }

  const pkg = readPkg()
  pkg.pnpm = pkg.pnpm || {}
  pkg.pnpm.overrides = pkg.pnpm.overrides || {}
  const linked = []
  for (const dir of fs.readdirSync(packagesDir)) {
    const pkgJson = path.join(packagesDir, dir, "package.json")
    if (!fs.existsSync(pkgJson)) continue
    const { name } = JSON.parse(fs.readFileSync(pkgJson, "utf8"))
    if (!name || !name.startsWith("@be-in-digital/")) continue
    pkg.pnpm.overrides[name] = `link:${path.join(packagesDir, dir)}`
    linked.push(name)
  }
  writePkg(pkg)
  console.log(`Overrides link: posés pour ${linked.length} packages.`)

  run("pnpm install", {
    env: {
      ...process.env,
      SKIP_NODE_AUTH_TOKEN_CHECK: "1",
      NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || "link-mode-placeholder",
    },
  })

  // Alignement des types React : les sources TS des packages linkés (et les
  // .d.ts de leurs deps peer comme radix) résolvent @types/react dans le
  // clone engine → deux copies nominalement incompatibles côté tsc (problème
  // inexistant en mode registre, où tout vit dans le node_modules du site).
  // On remplace la copie RÉELLE du store .pnpm du clone par un symlink vers
  // celle du site : toutes les chaînes de liens convergent alors dessus.
  const pnpmStore = path.join(enginePath, "node_modules", ".pnpm")
  for (const typesPkg of ["react", "react-dom"]) {
    const target = path.join(ROOT, "node_modules", "@types", typesPkg)
    if (!fs.existsSync(target) || !fs.existsSync(pnpmStore)) continue
    const realTarget = fs.realpathSync(target)
    for (const entry of fs.readdirSync(pnpmStore)) {
      if (!entry.startsWith(`@types+${typesPkg}@`)) continue
      const real = path.join(pnpmStore, entry, "node_modules", "@types", typesPkg)
      if (!fs.existsSync(real) || fs.lstatSync(real).isSymbolicLink()) continue
      fs.rmSync(real, { recursive: true, force: true })
      fs.symlinkSync(realTarget, real)
    }
  }

  // Marqueur pour next.config.ts : en mode link, Turbopack doit voir un root
  // qui englobe le clone engine (sinon "Module not found" sur les sources TS
  // hors projet). On calcule l'ancêtre commun et next.config l'applique via
  // outputFileTracingRoot tant que le marqueur existe.
  let commonRoot = path.dirname(ROOT)
  while (!path.resolve(enginePath).startsWith(commonRoot + path.sep)) {
    const parent = path.dirname(commonRoot)
    if (parent === commonRoot) break
    commonRoot = parent
  }
  fs.writeFileSync(
    path.join(ROOT, ".engine-link.json"),
    JSON.stringify({ enginePath, tracingRoot: commonRoot }, null, 2) + "\n",
  )

  console.log(`
Mode link ACTIF (engine : ${enginePath}, tracing root : ${commonRoot}).
⚠ Ne pas commiter package.json / pnpm-lock.yaml dans cet état.
Retour au registre : pnpm engine:unlink`)
}

function unlink() {
  const pkg = readPkg()
  if (pkg.pnpm && pkg.pnpm.overrides) {
    for (const key of Object.keys(pkg.pnpm.overrides)) {
      if (key.startsWith("@be-in-digital/")) delete pkg.pnpm.overrides[key]
    }
    if (Object.keys(pkg.pnpm.overrides).length === 0) delete pkg.pnpm.overrides
    if (Object.keys(pkg.pnpm).length === 0) delete pkg.pnpm
  }
  // onlyBuiltDependencies vit aussi sous pnpm : le restaurer s'il a sauté
  pkg.pnpm = pkg.pnpm || {}
  pkg.pnpm.onlyBuiltDependencies = pkg.pnpm.onlyBuiltDependencies || [
    "esbuild",
    "sharp",
    "unrs-resolver",
  ]
  writePkg(pkg)

  const lock = path.join(ROOT, "pnpm-lock.yaml")
  if (fs.existsSync(lock) && fs.readFileSync(lock, "utf8").includes("link:")) {
    fs.rmSync(lock)
    console.log("pnpm-lock.yaml (mode link) supprimé.")
  }
  const marker = path.join(ROOT, ".engine-link.json")
  if (fs.existsSync(marker)) fs.rmSync(marker)
  console.log(
    "Overrides retirés. Relancer `pnpm install` avec NODE_AUTH_TOKEN pour revenir au registre.",
  )
}

if (cmd === "link") link()
else if (cmd === "unlink") unlink()
else {
  console.error("Usage : engine-link.js <link [chemin]|unlink>")
  process.exit(1)
}
