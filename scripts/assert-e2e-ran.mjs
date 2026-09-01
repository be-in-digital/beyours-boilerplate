#!/usr/bin/env node
/**
 * Fails when the e2e run did not actually execute tests.
 *
 * Playwright exits 0 when it has nothing to run, and this suite has two ways of
 * having nothing to run that both look like success:
 *
 *   1. `playwright.config.ts` builds the `setup` and `admin` projects out of a
 *      spread — `...(hasRealBackend ? [project] : [])`. Without a backend they
 *      are not skipped, they are never declared, and 43 of 56 spec files vanish
 *      from the run AND from the report. There is no "skipped" line for a
 *      project that does not exist.
 *   2. Every test in a project can self-skip. `requireSeedPassword()` calls
 *      `test.skip(...)` when SEED_PASSWORD is unset, which is every test that
 *      signs in.
 *
 * Either way the job goes green over an untested product, which is worse than
 * no job at all because the green is believed. So: name the projects that must
 * report tests, and the floor the whole run must clear.
 *
 * Usage: node scripts/assert-e2e-ran.mjs <report.json> [--min N] [--projects a,b]
 */

import fs from "node:fs"

const args = process.argv.slice(2)
const reportPath = args[0]
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}

const MIN = Number(flag("--min", "1"))
const REQUIRED = flag("--projects", "").split(",").map((s) => s.trim()).filter(Boolean)

if (!reportPath || !fs.existsSync(reportPath)) {
  console.error(`::error::No Playwright JSON report at ${reportPath ?? "<unset>"}.`)
  console.error("The run produced no report at all, so nothing can be said about it.")
  process.exit(1)
}

let report
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"))
} catch (e) {
  console.error(`::error::Playwright report at ${reportPath} is not valid JSON: ${e.message}`)
  process.exit(1)
}

/** Walk the suite tree and count every test result by project and status. */
const byProject = new Map()
const bump = (project, key) => {
  if (!byProject.has(project)) {
    byProject.set(project, { ran: 0, skipped: 0 })
  }
  byProject.get(project)[key]++
}

const visit = (suite) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const project = test.projectName || suite.title || "(unnamed)"
      // "skipped" covers both test.skip() and a test never attempted.
      const skipped = (test.results ?? []).every((r) => r.status === "skipped")
      bump(project, skipped || test.status === "skipped" ? "skipped" : "ran")
    }
  }
  for (const child of suite.suites ?? []) visit(child)
}
for (const suite of report.suites ?? []) visit(suite)

const totalRan = [...byProject.values()].reduce((n, p) => n + p.ran, 0)

console.log("Playwright executed:")
if (byProject.size === 0) console.log("  (no projects reported any test)")
for (const [project, counts] of [...byProject].sort()) {
  console.log(`  ${project.padEnd(12)} ${String(counts.ran).padStart(4)} ran, ${counts.skipped} skipped`)
}

const problems = []
if (totalRan < MIN) {
  problems.push(`only ${totalRan} test(s) actually ran; at least ${MIN} were expected`)
}
for (const project of REQUIRED) {
  const counts = byProject.get(project)
  if (!counts) {
    problems.push(
      `project "${project}" reported nothing — it was not declared. ` +
        `That is the hasRealBackend spread: no backend, no project, no report, green run.`
    )
  } else if (counts.ran === 0) {
    problems.push(`project "${project}" declared ${counts.skipped} test(s) and ran none of them`)
  }
}

if (problems.length) {
  console.error(`\n::error::The e2e suite did not run. ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  console.error("\nA suite that ran nothing must not report success.")
  process.exit(1)
}

console.log(`\n${totalRan} test(s) ran across ${byProject.size} project(s).`)
