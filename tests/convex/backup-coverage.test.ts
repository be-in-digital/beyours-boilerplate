// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * What a backup carries, checked against the schema rather than against memory.
 *
 * The export order and the import allow-list used to be written out twice, in
 * two files, and agree by hand. Between them they named **22 of this schema's
 * 77 tables**: no `orders`, no `payments`, no `kitchenTickets`, no
 * `translations`, and none of the sixteen `cms*` singletons — so a "backup" of
 * a restaurant's website did not contain that website's pages, and a restore
 * reached zero orders. The maintenance fee was sold on « Sauvegardes
 * automatiques quotidiennes de vos données et contenus ». Issues #169, #366.
 *
 * Three properties are asserted here, and each one is a way that list rots:
 *
 *  1. **Every table is classified.** A table added to the schema and to no list
 *     is silently absent from every backup — which is exactly how the sixteen
 *     CMS singletons happened.
 *  2. **The import order is a topological sort of the real foreign-key graph.**
 *     Derived from the schema's own validators, so a new `v.id()` field that
 *     breaks the order fails here rather than during someone's restore.
 *  3. **The fiscal archive is exported and never re-inserted.** `invoices.ts`
 *     states the rule in the schema itself (art. 242 nonies A CGI).
 */

import { describe, expect, test } from "vitest"
import schema from "../../convex/schema"
import {
  BACKUP_TABLES,
  DEFERRED_REMAP_TABLES,
  EXCLUDED_TABLES,
  EXPORTED_TABLES,
  EXPORT_ONLY_TABLES,
  REDACTED_BACKUP_FIELDS,
} from "@be-in-digital/convex-functions/backupTables"

const SCHEMA_TABLES = Object.keys(schema.tables)

/**
 * Which tables one table's rows can point at.
 *
 * Read out of the validator Convex compiled, not out of the source: a
 * `v.id("stores")` nested three objects deep inside an array is found the same
 * way as a top-level one, and nothing here has to be kept in step with a
 * refactor of the table files.
 *
 * `_storage` and `_scheduled_functions` are Convex's own and are not tables a
 * backup can carry.
 */
function referencedTables(name: string): string[] {
  const json = JSON.stringify(
    (schema.tables as Record<string, { validator: { json: unknown } }>)[name].validator.json,
  )
  const found = json.match(/"tableName":"([A-Za-z0-9_]+)"/g) ?? []
  return [
    ...new Set(
      found
        .map((entry) => entry.split('"')[3] as string)
        .filter((table) => table !== name && !table.startsWith("_")),
    ),
  ]
}

describe("backup coverage", () => {
  test("every table in the schema is classified, exactly once", () => {
    const classified = [
      ...BACKUP_TABLES,
      ...EXPORT_ONLY_TABLES,
      ...EXCLUDED_TABLES.map((entry) => entry.table),
    ]

    // Unclassified is the failure mode: a table added to the schema and to no
    // list is absent from every backup, and nothing says so.
    expect([...SCHEMA_TABLES].sort()).toEqual([...classified].sort())
    expect(new Set(classified).size).toBe(classified.length)
  })

  test("names no table the schema does not have", () => {
    for (const table of EXPORTED_TABLES) {
      expect(SCHEMA_TABLES).toContain(table)
    }
    for (const { table } of EXCLUDED_TABLES) {
      expect(SCHEMA_TABLES).toContain(table)
    }
  })

  test("carries the establishment's website, its orders and its translations", () => {
    // The four families the old 22-table list dropped, named individually
    // because each was its own reported defect.
    const CMS_SINGLETONS = [
      "cms", "cmsHome", "cmsMenu", "cmsAbout", "cmsContact", "cmsBlogPosts",
      "cmsCart", "cmsCheckout", "cmsTracking", "cmsSignin", "cmsSignup",
      "cmsPrivacy", "cmsTerms", "cms404", "cmsMaintenance", "cmsAccount",
    ]
    for (const table of CMS_SINGLETONS) {
      expect(BACKUP_TABLES).toContain(table)
    }
    for (const table of ["orders", "payments", "kitchenTickets", "translations", "teamMembers"]) {
      expect(BACKUP_TABLES).toContain(table)
    }
  })

  test("the import order is a topological sort of the foreign-key graph", () => {
    const position = new Map(BACKUP_TABLES.map((table, index) => [table as string, index]))
    const exportOnly = new Set<string>(EXPORT_ONLY_TABLES)
    const deferred = new Set<string>(DEFERRED_REMAP_TABLES)

    const violations: string[] = []
    for (const table of BACKUP_TABLES) {
      for (const target of referencedTables(table)) {
        // Never re-inserted, so its ids never change and the reference still
        // resolves after a restore. See the module header of backupTables.ts.
        if (exportOnly.has(target)) continue

        if (!position.has(target)) {
          violations.push(`${table} → ${target} (target is not restored)`)
          continue
        }
        if ((position.get(target) as number) > (position.get(table) as number)) {
          // An edge the order breaks on purpose is fixed by a second pass.
          if (deferred.has(table)) continue
          violations.push(`${table} → ${target} (target is imported later)`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  test("every deferred table really has an edge that needs deferring", () => {
    // A stale entry here would cost a full table re-walk on every restore for
    // nothing, and would hide the next real cycle behind an exemption.
    const position = new Map(BACKUP_TABLES.map((table, index) => [table as string, index]))

    for (const table of DEFERRED_REMAP_TABLES) {
      const late = referencedTables(table).filter(
        (target) =>
          position.has(target) &&
          (position.get(target) as number) > (position.get(table) as number),
      )
      expect(late.length).toBeGreaterThan(0)
    }
  })

  test("the fiscal archive is exported and never restored", () => {
    for (const table of ["invoices", "numberSequences"]) {
      // In the file: a backup that loses an establishment's invoices is not a
      // backup of that establishment.
      expect(EXPORTED_TABLES).toContain(table)
      // Not in the restore: a numbered series a restore can rewrite is not a
      // series (art. 242 nonies A CGI, and `tables/invoices.ts` says so).
      expect(BACKUP_TABLES).not.toContain(table)
    }
  })

  test("carries no credential and no identity", () => {
    for (const table of ["paymentConnections", "uberEatsConnections", "userProfiles"]) {
      expect(EXPORTED_TABLES).not.toContain(table)
      expect(EXCLUDED_TABLES.map((entry) => entry.table)).toContain(table)
    }
  })

  test("every exclusion carries a reason an operator can read", () => {
    // The manifest shows this list verbatim. "Absent because it is not the
    // establishment's" and "absent because someone forgot" used to look
    // identical from the outside.
    for (const { table, reason } of EXCLUDED_TABLES) {
      expect(reason.length, `${table} has no reason`).toBeGreaterThan(20)
    }
  })

  test("strips only fields the schema lets a restore come back without", () => {
    // A stripped field that the schema requires would make every restore of
    // that table fail validation.
    for (const [table, fields] of Object.entries(REDACTED_BACKUP_FIELDS)) {
      expect(BACKUP_TABLES).toContain(table)
      const validator = (
        schema.tables as Record<
          string,
          { validator: { json: { value: Record<string, { optional: boolean }> } } }
        >
      )[table].validator.json
      for (const field of fields) {
        expect(validator.value[field], `${table}.${field} is not in the schema`).toBeDefined()
        // A stripped field the schema requires would make every restore of that
        // table fail validation.
        expect(validator.value[field].optional, `${table}.${field} is required`).toBe(true)
      }
    }
  })
})
