#!/usr/bin/env node
/**
 * Initialisation d'un nouveau site client à partir du boilerplate.
 *
 * Usage :
 *   pnpm setup                        # interactif
 *   pnpm setup -- --name "Chez Luigi" --yes   # non-interactif
 *
 * Idempotent : la présence de .beindigital-site.json marque un site déjà
 * initialisé (relancer avec --force pour ré-exécuter).
 *
 * Configuration : web seul (défaut) ou web + app mobile Expo
 * (--mobile / --web pour forcer sans question).
 * Template design : --template <slug> (pizzeria, fast-food, food-truck,
 * poulet, asiatique — `pnpm template:list` pour le catalogue) ; le wizard
 * le propose, défaut : neutre engine.
 *
 * Ce que fait le script :
 *   1. Renseigne site.config.ts (nom, description, locale)
 *   2. Applique le template design (site/theme.css + site/fonts.ts)
 *   3. Renomme le package (slug du site)
 *   4. Crée .env.local depuis .env.example + génère les secrets
 *      (BETTER_AUTH_SECRET, ENCRYPTION_KEY)
 *   5. Ajoute le remote git `template` (mises à jour du boilerplate)
 *   6. Écrit le sentinel .beindigital-site.json
 */

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import readline from "node:readline"
import { execSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { activateMobile } from "./add-mobile.mjs"
import { applyTemplate, listTemplates } from "./apply-template.mjs"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const SENTINEL = path.join(ROOT, ".beindigital-site.json")
const TEMPLATE_REPO =
  "https://github.com/be-in-digital/beindigital-boilerplate.git"

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")
    ? args[i + 1]
    : undefined
}

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Prompt compatible TTY ET stdin pipé : les lignes sont mises en file dès
// leur arrivée ; après EOF, toute question restante reçoit "" (= défaut).
// (readline.question classique ne résout jamais une question posée après la
// fermeture d'un pipe — le process sortait en silence, init à moitié fait.)
// Même mécanique que scripts/env.mjs.
function createPrompt() {
  const rl = readline.createInterface({ input: process.stdin })
  const queue = []
  let pending = null
  let closed = false
  rl.on("line", (l) => {
    if (pending) {
      const resolve = pending
      pending = null
      resolve(l)
    } else {
      queue.push(l)
    }
  })
  rl.on("close", () => {
    closed = true
    if (pending) {
      const resolve = pending
      pending = null
      resolve("")
    }
  })
  const nextLine = () => {
    if (queue.length > 0) return Promise.resolve(queue.shift())
    if (closed) return Promise.resolve("")
    return new Promise((resolve) => (pending = resolve))
  }
  const ask = async (question, fallback = "") => {
    process.stdout.write(`${question}${fallback ? ` (${fallback})` : ""} : `)
    const a = (await nextLine()).trim()
    if (!process.stdin.isTTY) process.stdout.write(`${a}\n`)
    return a || fallback
  }
  return { ask, close: () => rl.close() }
}

function replaceOnce(file, from, to, label) {
  const p = path.join(ROOT, file)
  const src = fs.readFileSync(p, "utf8")
  if (!src.includes(from)) {
    console.warn(`  ! ${file} : valeur par défaut "${label}" introuvable, non modifié`)
    return
  }
  fs.writeFileSync(p, src.split(from).join(to))
  console.log(`  ✓ ${file} : ${label}`)
}

async function main() {
  if (fs.existsSync(SENTINEL) && !flag("force")) {
    const info = JSON.parse(fs.readFileSync(SENTINEL, "utf8"))
    console.log(`Site déjà initialisé : ${info.name} (${info.slug})`)
    console.log("Relancer avec --force pour ré-exécuter.")
    return
  }

  let name = opt("name")
  let description = opt("description")
  let locale = opt("locale")
  let mobile = flag("mobile") ? true : flag("web") ? false : undefined
  let template = opt("template")

  const templates = listTemplates(ROOT)
  if (template && !templates.some((t) => t.slug === template)) {
    console.error(
      `Template inconnu : "${template}". Disponibles : ${templates.map((t) => t.slug).join(", ")}`,
    )
    process.exit(1)
  }

  if (
    !flag("yes") &&
    (!name || !description || !locale || mobile === undefined || template === undefined)
  ) {
    const prompt = createPrompt()
    name = name || (await prompt.ask("Nom du restaurant / site", "Mon Restaurant"))
    description =
      description ||
      (await prompt.ask(
        "Description (SEO)",
        "Commande en ligne, click & collect et livraison.",
      ))
    locale = locale || (await prompt.ask("Locale par défaut", "fr"))
    if (mobile === undefined) {
      const answer = await prompt.ask(
        "Configuration — 1) web seul  2) web + app mobile",
        "1",
      )
      mobile = answer.trim() === "2"
    }
    if (template === undefined && templates.length > 0) {
      console.log("\nTemplate design :")
      templates.forEach((t, i) => console.log(`  ${i + 1}) ${t.label}`))
      const answer = await prompt.ask("Template (numéro ou slug)", "1")
      const picked =
        templates[Number(answer) - 1] ||
        templates.find((t) => t.slug === answer.trim()) ||
        templates[0]
      template = picked.slug
    }
    prompt.close()
  }
  mobile = mobile === true
  template = template || "default"
  name = name || "Mon Restaurant"
  description =
    description || "Commande en ligne, click & collect et livraison."
  locale = locale || "fr"
  const slug = slugify(name) || "beindigital-site"

  console.log("\n1. site.config.ts")
  replaceOnce("site.config.ts", 'name: "Mon Restaurant"', `name: ${JSON.stringify(name)}`, "nom")
  replaceOnce(
    "site.config.ts",
    'description: "Commande en ligne, click & collect et livraison."',
    `description: ${JSON.stringify(description)}`,
    "description",
  )
  replaceOnce(
    "site.config.ts",
    'titleTemplate: "%s — Mon Restaurant"',
    `titleTemplate: ${JSON.stringify(`%s — ${name}`)}`,
    "titre",
  )
  replaceOnce(
    "site.config.ts",
    'defaultLocale: "fr"',
    `defaultLocale: ${JSON.stringify(locale)}`,
    "locale",
  )

  console.log("\n2. template design")
  const templateMeta = applyTemplate(template, ROOT)
  console.log(
    template === "default"
      ? "  = neutre engine (thème et polices d'origine)"
      : `  ✓ ${templateMeta.label}`,
  )

  console.log("\n3. package.json")
  const pkgPath = path.join(ROOT, "package.json")
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
  const templateVersion = pkg.version
  pkg.name = slug
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
  console.log(`  ✓ name → ${slug}`)

  console.log("\n4. .env.local")
  const envLocal = path.join(ROOT, ".env.local")
  if (fs.existsSync(envLocal)) {
    console.log("  = .env.local existe déjà, non modifié")
  } else {
    let env = fs.readFileSync(path.join(ROOT, ".env.example"), "utf8")
    env = env.replace(
      /^BETTER_AUTH_SECRET=.*$/m,
      `BETTER_AUTH_SECRET=${crypto.randomBytes(32).toString("base64")}`,
    )
    env = env.replace(
      /^ENCRYPTION_KEY=.*$/m,
      `ENCRYPTION_KEY=${crypto.randomBytes(32).toString("hex")}`,
    )
    fs.writeFileSync(envLocal, env)
    console.log("  ✓ créé (secrets BETTER_AUTH_SECRET / ENCRYPTION_KEY générés)")
  }

  console.log("\n5. remote git `template`")
  try {
    const remotes = execSync("git remote", { cwd: ROOT }).toString().split("\n")
    if (remotes.includes("template")) {
      console.log("  = remote template déjà présent")
    } else {
      execSync(`git remote add template ${TEMPLATE_REPO}`, { cwd: ROOT })
      console.log(`  ✓ template → ${TEMPLATE_REPO}`)
    }
  } catch {
    console.warn("  ! pas de repo git détecté — remote template non ajouté")
  }

  console.log("\n6. sentinel")
  fs.writeFileSync(
    SENTINEL,
    JSON.stringify(
      {
        name,
        slug,
        mobile,
        template,
        templateRepo: TEMPLATE_REPO,
        templateVersion,
        initializedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  )
  console.log("  ✓ .beindigital-site.json")

  if (mobile) {
    console.log("\n7. app mobile")
    activateMobile({ name, slug })
  }

  console.log(`
────────────────────────────────────────────────────────
Site "${name}" initialisé (${mobile ? "web + app mobile" : "web"}, template design : ${template}). Prochaines étapes :

  1. pnpx convex dev          # provisionne le deployment Convex
  2. pnpm env:setup           # wizard .env (web + convex + mobile)
  3. pnpm convex:env          # pousse .env.convex côté backend
  4. pnpm dev${mobile ? "\n  5. cd mobile && pnpm install && pnpm start   # app Expo" : ""}

Personnalisation : site.config.ts, site/ (thème, polices, composants),
public/ (logos). Couleurs client : site/theme.css (direction :
templates/${template}/DESIGN.md). Changer de template : pnpm template:list.
Voir docs/CUSTOMIZATION.md.
Mises à jour : pnpm update:engine / pnpm update:template. Voir docs/UPDATES.md.
────────────────────────────────────────────────────────`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
