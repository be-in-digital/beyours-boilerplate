#!/usr/bin/env node
/**
 * Design templates — catalog and application.
 *
 * Usage:
 *   pnpm template:list                # catalog of available templates
 *   pnpm template:apply <slug>        # applies a template to the site
 *   pnpm template:apply default       # restores the original theme
 *
 * Applying a template copies templates/<slug>/theme.css and fonts.ts into
 * site/ (client zone) and records the choice in .beindigital-site.json if the
 * site is initialized. site/theme.css and site/fonts.ts are OVERWRITTEN:
 * review `git diff site/` before committing if the site already had
 * customizations.
 *
 * Art direction details: templates/<slug>/DESIGN.md and templates/README.md.
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const DEFAULT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

/** Available templates: directories under templates/ that carry a template.json. */
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
  // Neutral first, then alphabetical order
  return templates.sort((a, b) =>
    a.slug === "default" ? -1 : b.slug === "default" ? 1 : a.slug.localeCompare(b.slug),
  )
}

/**
 * Applies a template: copies theme.css + fonts.ts into site/ and updates the
 * .beindigital-site.json sentinel if it exists. Returns the metadata.
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
