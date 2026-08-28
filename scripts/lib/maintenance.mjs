/**
 * Maintenance gate for the two update channels.
 *
 * A site is sold with one year of maintenance, renewable annually. Renewing is
 * what pays for the engine work, so a site that stops renewing keeps running
 * but stops receiving updates — the « gel de version » of the CGV.
 *
 * This asks beyours.fr whether the contract still covers this site before
 * `pnpm update:engine` or `pnpm update:template` pulls anything.
 *
 * It is a courtesy, not a lock. Anyone with the repo can run `git merge
 * template/main` by hand. What actually freezes a lapsed site is revoking its
 * access to the private boilerplate repo and to the @be-in-digital/* registry
 * (docs/UPDATES.md). What this buys is a client who reads why the update
 * stopped and how to resume, instead of a raw 403 from GitHub.
 *
 * Fails OPEN by design: a site whose contract cannot be reached — no network,
 * our API down, a key we never issued — updates as before. Blocking a client
 * who pays because of our own outage would cost more than the update we saved.
 */

import fs from "node:fs"
import path from "node:path"

const SENTINEL = ".beindigital-site.json"
const TIMEOUT_MS = 5000

function readSentinel(root) {
  const file = path.join(root, SENTINEL)
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch {
    return null
  }
}

/**
 * Blocks the update when the maintenance contract has lapsed.
 * Silent when there is nothing to check: the boilerplate itself has no
 * sentinel, and sites provisioned before the gate existed carry no key.
 *
 * @param {{ root: string, channel: "engine" | "template" }} options
 * @returns {Promise<void>} resolves when the update may proceed; exits 1 otherwise
 */
export async function assertMaintenanceCurrent({ root, channel }) {
  const site = readSentinel(root)
  const licenseKey = process.env.BEYOURS_LICENSE_KEY || site?.licenseKey
  const api = process.env.BEYOURS_LICENSE_API || site?.licenseApi

  // Nothing provisioned to check against — this is not a client site.
  if (!licenseKey || !api) return

  let payload
  try {
    const url = new URL("/maintenance/status", api)
    url.searchParams.set("key", licenseKey)
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    payload = await res.json()
  } catch (err) {
    console.warn(
      `Contrat de maintenance invérifiable (${err.message}) — mise à jour poursuivie.`,
    )
    return
  }

  if (payload.entitled) {
    // Only worth a line when something needs the client's attention.
    if (payload.reason !== "active" && payload.message) {
      console.warn(`⚠︎  ${payload.message}\n`)
    }
    return
  }

  const label = channel === "engine" ? "moteur" : "template"
  console.error(`
────────────────────────────────────────────────────────
MISE À JOUR ${label.toUpperCase()} SUSPENDUE

${payload.message}

${payload.site ? `Site : ${payload.site}\n` : ""}Reprendre la maintenance : https://beyours.fr/espace-client
Une question : contact@beyours.fr
────────────────────────────────────────────────────────`)
  process.exit(1)
}
