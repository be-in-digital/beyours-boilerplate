import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { applyTemplate, listTemplates, resolveTemplateSlug } from "./apply-template.mjs"

/**
 * Alias resolution for `pnpm template:apply`.
 *
 * Five of the fifty themes the catalogue sells are their vertical's base
 * template, kept in a directory named for the bare vertical — `templates/
 * asiatique/` is sold as `asiatique-izakaya`. Applying the slug the buyer was
 * shown used to fail outright, so these tests pin both halves: the alias
 * resolves, and everything written downstream uses the directory it resolved to.
 */

/** A throwaway root with two templates, one of which carries an alias. */
function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apply-template-"))
  fs.mkdirSync(path.join(root, "site"), { recursive: true })

  const write = (slug, meta) => {
    const dir = path.join(root, "templates", slug)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify(meta))
    fs.writeFileSync(path.join(dir, "theme.css"), `/* ${slug} */\n`)
    fs.writeFileSync(path.join(dir, "fonts.ts"), `export const font = "${slug}"\n`)
  }

  write("asiatique", {
    slug: "asiatique",
    label: "Izakaya — contemporary Asian",
    themeName: "Izakaya",
    aliases: ["asiatique-izakaya"],
  })
  write("asiatique-wokstreet", { slug: "asiatique-wokstreet", label: "Wok Street" })

  return root
}

describe("resolveTemplateSlug", () => {
  let root
  beforeEach(() => { root = makeRoot() })
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it("resolves a slug that is a real directory", () => {
    expect(resolveTemplateSlug("asiatique-wokstreet", root)).toBe("asiatique-wokstreet")
  })

  it("resolves the slug the theme is sold under to its base directory", () => {
    expect(resolveTemplateSlug("asiatique-izakaya", root)).toBe("asiatique")
  })

  it("returns null for a name nothing claims", () => {
    expect(resolveTemplateSlug("asiatique-nonesuch", root)).toBeNull()
  })

  it("prefers a real directory over an alias of the same name", () => {
    // A future templates/asiatique-izakaya/ must supersede the alias without
    // anyone remembering to delete it.
    const dir = path.join(root, "templates", "asiatique-izakaya")
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify({ slug: "asiatique-izakaya" }))
    expect(resolveTemplateSlug("asiatique-izakaya", root)).toBe("asiatique-izakaya")
  })
})

describe("applyTemplate", () => {
  let root
  beforeEach(() => { root = makeRoot() })
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it("applies the base template when given the slug it is sold under", () => {
    const meta = applyTemplate("asiatique-izakaya", root)

    expect(meta.slug).toBe("asiatique")
    expect(fs.readFileSync(path.join(root, "site", "theme.css"), "utf8")).toContain("asiatique")
  })

  it("records the resolved slug in the sentinel, not the alias", () => {
    // The sentinel is what `update:template` reads back later; an alias there
    // would send it looking for a directory that does not exist.
    const sentinel = path.join(root, ".beindigital-site.json")
    fs.writeFileSync(sentinel, JSON.stringify({ template: "default" }))

    applyTemplate("asiatique-izakaya", root)

    expect(JSON.parse(fs.readFileSync(sentinel, "utf8")).template).toBe("asiatique")
  })

  it("names the aliases among the available templates when the slug is unknown", () => {
    expect(() => applyTemplate("asiatique-nonesuch", root)).toThrow(/asiatique-izakaya/)
  })
})

describe("listTemplates", () => {
  it("exposes the aliases so the catalogue can be cross-checked", () => {
    const root = makeRoot()
    try {
      const asiatique = listTemplates(root).find((t) => t.slug === "asiatique")
      expect(asiatique.aliases).toEqual(["asiatique-izakaya"])
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })
})
