/**
 * An end-to-end case that finds no data must say so, not pass (#533).
 *
 * WHAT THIS IS ABOUT. `order-detail.spec.ts` read
 * `const hasOrder = await navigateToFirstOrder(page); if (hasOrder) { … }` in
 * every one of its cases, and the admin project's database has no order when CI
 * runs it. Thirteen green cases, zero assertions executed — and it stayed green
 * while the row it clicks stopped navigating altogether. Run against a seeded
 * bench, two of them fail.
 *
 * `test.skip(condition, reason)` is the honest form of the same fact: it appears
 * in the report as a skip, with the reason, so somebody can see that the suite
 * did not cover what it claims to cover. A silent early return cannot be
 * distinguished from a pass by any reader or any tool.
 *
 * WHY A PINNED LIST RATHER THAN A CLEAN SWEEP. Three other specs carry the same
 * shape, twenty-three times between them, and each needs its own judgement about
 * what to seed or what to skip. Rewriting them blind — mechanically swapping
 * `if` for `test.skip` — would turn silent passes into loud skips without
 * anybody deciding whether the case should be running. They are named here
 * instead, with their counts, so the ledger is visible and a NEW one fails.
 *
 * Remove a name when its spec is fixed. The second case below fails if you
 * forget.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const APP = process.cwd()
const E2E = join(APP, "e2e")

/**
 * The specs still opting out of themselves in silence, with how many times.
 *
 * Each is a case that may assert nothing and report a pass. Fixing one means
 * deciding, per case, whether to seed the data or to skip with a reason — which
 * is why they are a ledger and not a sweep.
 */
const PINNED: Record<string, number> = {
  "admin/blog-editor.spec.ts": 4,
  "admin/promotions.spec.ts": 2,
  "admin/store-detail.spec.ts": 17,
}

/**
 * A body guarded on a "did we find any data" boolean.
 *
 * Deliberately narrow: `if (hasOrder)`, `if (hasRows)`, `if (hasStore)`. It is
 * the shape the defect actually took, and a broader pattern would fire on every
 * ordinary conditional in a spec — which is how a guard gets an allowlist so
 * long it stops meaning anything.
 */
const VACUOUS_GUARD = /\bif\s*\(\s*has[A-Z]\w*\s*\)/g

/** Every spec under `e2e/`, as a path relative to it. */
function specs(dir: string = E2E, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".auth") continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) specs(full, out)
    else if (entry.endsWith(".spec.ts")) out.push(full.slice(E2E.length + 1))
  }
  return out
}

/** How many guarded bodies a spec has, comments excluded. */
function offences(relative: string): number {
  const source = readFileSync(join(E2E, relative), "utf8")
    // The rewritten spec explains the pattern in its own header, and a scanner
    // that reads comments cannot tell the explanation from the thing explained.
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
  return (source.match(VACUOUS_GUARD) ?? []).length
}

describe("the end-to-end suite", () => {
  const found = specs()

  it("has specs to read", () => {
    // Anti-vacuity, in a file about vacuity: a wrong E2E path would make every
    // assertion below pass by finding nothing.
    expect(found.length).toBeGreaterThan(20)
  })

  it("opts out of a case loudly or not at all", () => {
    const offenders = Object.fromEntries(
      found.map((spec) => [spec, offences(spec)]).filter(([, n]) => (n as number) > 0)
    )
    const unpinned = Object.fromEntries(
      Object.entries(offenders).filter(([spec]) => !(spec in PINNED))
    )

    expect(
      unpinned,
      "a spec skips its own assertions silently — use test.skip(condition, reason)"
    ).toEqual({})
  })

  it("keeps the pinned list honest — a spec that is fixed must leave it", () => {
    const stale = Object.entries(PINNED).filter(([spec, count]) => {
      if (!found.includes(spec)) return true
      return offences(spec) !== count
    })

    expect(
      stale,
      "a pinned spec changed: drop it from PINNED if it is fixed, or update its count"
    ).toEqual([])
  })

  it("holds order-detail.spec.ts to the fixed shape", () => {
    // The one this issue was about, asserted directly rather than by its absence
    // from PINNED — so deleting the list would not silently release it.
    const source = readFileSync(join(E2E, "admin/order-detail.spec.ts"), "utf8")

    expect(offences("admin/order-detail.spec.ts")).toBe(0)
    expect(source).toContain("test.skip(")
    // And the assertion that makes the click mean anything.
    expect(source).toContain("toHaveURL(")
  })

  it("catches the shape when there is one", () => {
    // Anti-vacuity for the regex itself, both directions.
    expect("if (hasOrder) {".match(VACUOUS_GUARD)).toHaveLength(1)
    expect("if ( hasRows )".match(VACUOUS_GUARD)).toHaveLength(1)
    expect("if (hasOrder === false)".match(VACUOUS_GUARD)).toBeNull()
    expect("if (hasty)".match(VACUOUS_GUARD)).toBeNull()
    expect("test.skip(!hasOrder, 'why')".match(VACUOUS_GUARD)).toBeNull()
  })
})
