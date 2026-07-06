#!/usr/bin/env node
/**
 * Templates design — catalogue et application.
 *
 * Usage :
 *   pnpm template:list                # catalogue des templates disponibles
 *   pnpm template:apply <slug>        # applique un template au site
 *   pnpm template:apply default       # restaure le thème d'origine
 *
 * Appliquer un template copie templates/<slug>/theme.css et fonts.ts vers
 * site/ (zone client) et note le choix dans .beindigital-site.json si le
 * site est initialisé. site/theme.css et site/fonts.ts sont ÉCRASÉS :
 * relire `git diff site/` avant de committer si le site avait déjà des
 * personnalisations.
 *
 * Détail des directions : templates/<slug>/DESIGN.md et templates/README.md.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DEFAULT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Templates disponibles : dossiers de templates/ portant un template.json. */
export function listTemplates(root = DEFAULT_ROOT) {
  const dir = path.join(root, "templates")
  if (!fs.existsSync(dir)) return []
  const templates = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const metaPath = path.join(dir, entry.name, "template.json")
    if (!fs.existsSync(metaPath)) continue
    try {
      templates.push(JSON.parse(fs.readFileSync(metaPath, "utf8")))
    } catch {
      console.warn(`  ! templates/${entry.name}/template.json illisible, ignoré`)
    }
  }
  // Le neutre d'abord, puis l'ordre alphabétique
  return templates.sort((a, b) =>
    a.slug === "default" ? -1 : b.slug === "default" ? 1 : a.slug.localeCompare(b.slug),
  )
}

/**
 * Applique un template : copie theme.css + fonts.ts vers site/ et met à jour
 * le sentinel .beindigital-site.json s'il existe. Retourne les métadonnées.
 */
export function applyTemplate(slug, root = DEFAULT_ROOT) {
  const dir = path.join(root, "templates", slug)
  const metaPath = path.join(dir, "template.json")
  if (!fs.existsSync(metaPath)) {
    const known = listTemplates(root).map((t) => t.slug).join(", ")
    throw new Error(`Template inconnu : "${slug}". Disponibles : ${known}`)
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"))

  for (const [from, to] of [
    ["theme.css", path.join("site", "theme.css")],
    ["fonts.ts", path.join("site", "fonts.ts")],
  ]) {
    const src = path.join(dir, from)
    if (!fs.existsSync(src)) throw new Error(`Fichier manquant : templates/${slug}/${from}`)
    fs.copyFileSync(src, path.join(root, to))
    console.log(`  ✓ ${to} ← templates/${slug}/${from}`)
  }

  const sentinelPath = path.join(root, ".beindigital-site.json")
  if (fs.existsSync(sentinelPath)) {
    const sentinel = JSON.parse(fs.readFileSync(sentinelPath, "utf8"))
    sentinel.template = slug
    fs.writeFileSync(sentinelPath, JSON.stringify(sentinel, null, 2) + "\n")
    console.log(`  ✓ .beindigital-site.json : template → ${slug}`)
  }

  return meta
}

function printList(root) {
  const templates = listTemplates(root)
  if (templates.length === 0) {
    console.log("Aucun template trouvé dans templates/.")
    return
  }
  console.log("Templates design disponibles :\n")
  for (const t of templates) {
    const cat = t.category ? `[${t.category}] ` : ""
    console.log(`  ${t.slug.padEnd(12)} ${cat}${t.label}`)
    console.log(`  ${"".padEnd(12)} ${t.description}`)
    if (t.fonts)
      console.log(
        `  ${"".padEnd(12)} titres ${t.fonts.heading} · texte ${t.fonts.body} · signature ${t.primary}\n`,
      )
  }
  console.log("Appliquer : pnpm template:apply <slug>")
  console.log("Aperçu    : ouvrir templates/preview.html · détail : templates/<slug>/DESIGN.md")
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const [command, slug] = process.argv.slice(2)
  try {
    if (command === "list" || command === undefined) {
      printList(DEFAULT_ROOT)
    } else if (command === "apply") {
      if (!slug) {
        console.error("Usage : pnpm template:apply <slug>  (pnpm template:list pour le catalogue)")
        process.exit(1)
      }
      const meta = applyTemplate(slug, DEFAULT_ROOT)
      console.log(`\nTemplate « ${meta.label} » appliqué.`)
      console.log("Relire : git diff site/ — puis ajuster les couleurs du client dans site/theme.css")
      console.log(`Direction artistique : templates/${slug}/DESIGN.md`)
    } else {
      console.error(`Commande inconnue : ${command}. Utiliser "list" ou "apply <slug>".`)
      process.exit(1)
    }
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
