#!/usr/bin/env node
/**
 * Site environment variable management — all 3 files at once:
 *
 *   .env.local    (Next.js web)      ← source of truth
 *   .env.convex   (Convex backend)   ← shared subset, pushed with
 *                                      `pnpm convex:env`
 *   mobile/.env   (Expo app)         ← EXPO_PUBLIC_CONVEX_URL
 *
 * Usage:
 *   pnpm env:setup    # wizard: required vars + integrations (Stripe, AWS, Uber…)
 *   pnpm env:check    # status: missing required vars, incomplete integrations
 *   pnpm env:sync     # propagates .env.local → .env.convex + mobile/.env
 *
 * The REQUIRED / GROUPS / CONVEX_KEYS lists mirror the Zod schemas in
 * @be-in-digital/core (src/env/schemas.ts) — keep them in sync when the
 * engine is updated.
 */

import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import readline from "node:readline"
import { fileURLToPath } from "node:url"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const ENV_LOCAL = path.join(ROOT, ".env.local")
const ENV_CONVEX = path.join(ROOT, ".env.convex")
const ENV_MOBILE = path.join(ROOT, "mobile", ".env")

/** Required for the site to boot (validated by instrumentation.ts). */
const REQUIRED = [
  "NEXT_PUBLIC_CONVEX_URL",
  "CONVEX_SITE_URL",
  "CONVEX_DEPLOYMENT",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "ENCRYPTION_KEY",
]

/** Automatic generators used when the value is empty. */
const GENERATORS = {
  BETTER_AUTH_SECRET: () => crypto.randomBytes(32).toString("base64"),
  ENCRYPTION_KEY: () => crypto.randomBytes(32).toString("hex"),
}

/** Optional integrations, enabled one by one in the wizard. */
const GROUPS = [
  { name: "AWS (S3 médias + SES emails) — requis en prod (compte du client)", keys: ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET_NAME", "AWS_SES_FROM_EMAIL", "AWS_SES_FROM_NAME", "AWS_SES_REPLY_TO_EMAIL", "AWS_SES_CONFIGURATION_SET"] },
  { name: "Stripe (paiement CB)", keys: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { name: "PayPal", keys: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_SANDBOX_MODE"] },
  { name: "SumUp", keys: ["SUMUP_CLIENT_ID", "SUMUP_CLIENT_SECRET"] },
  { name: "OpenAI (traductions auto) — requis en prod (plateforme)", keys: ["OPENAI_API_KEY"] },
  { name: "Uber Eats", keys: ["UBER_EATS_CLIENT_ID", "UBER_EATS_CLIENT_SECRET", "UBER_EATS_WEBHOOK_SECRET", "UBER_EATS_SANDBOX_MODE"] },
  { name: "Deliveroo", keys: ["DELIVEROO_CLIENT_ID", "DELIVEROO_CLIENT_SECRET", "DELIVEROO_WEBHOOK_SECRET", "DELIVEROO_BRAND_ID", "DELIVEROO_SITE_ID", "DELIVEROO_IS_SANDBOX"] },
  { name: "Google Maps (adresses)", keys: ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"] },
  // Le DSN seul est une configuration complète : les erreurs remontent, seules
  // les stack traces restent minifiées. Il reste donc seul dans son groupe —
  // l'ajouter aux trois clés d'upload rendrait le groupe « partiel » et ferait
  // échouer `env:check` sur une installation qui marche.
  { name: "Sentry (monitoring) — 1 projet Sentry par client", keys: ["NEXT_PUBLIC_SENTRY_DSN"] },
  // Tout ou rien, comme SITE_FEATURE_GROUPS côté schéma : la moitié de ce
  // groupe n'uploade rien et laisse chaque trace de prod minifiée.
  { name: "Sentry source maps (build) — traces lisibles en prod", keys: ["SENTRY_ORG", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN"] },
  { name: "Unsplash (médias CMS)", keys: ["UNSPLASH_ACCESS_KEY"] },
]

/** Keys to replicate on the Convex side (backend functions). */
const CONVEX_KEYS = [
  "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "SITE_URL", "ENCRYPTION_KEY",
  "AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME", "AWS_SES_FROM_EMAIL", "AWS_SES_FROM_NAME",
  "AWS_SES_REPLY_TO_EMAIL", "AWS_SES_CONFIGURATION_SET",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_SANDBOX_MODE",
  "SUMUP_CLIENT_ID", "SUMUP_CLIENT_SECRET",
  "UBER_EATS_CLIENT_ID", "UBER_EATS_CLIENT_SECRET",
  "UBER_EATS_WEBHOOK_SECRET", "UBER_EATS_SANDBOX_MODE",
  "DELIVEROO_CLIENT_ID", "DELIVEROO_CLIENT_SECRET",
  "DELIVEROO_WEBHOOK_SECRET", "DELIVEROO_BRAND_ID", "DELIVEROO_SITE_ID",
  "DELIVEROO_IS_SANDBOX",
  "UNSPLASH_ACCESS_KEY",
]

// ---------------------------------------------------------------------------

function parse(file) {
  if (!fs.existsSync(file)) return {}
  const vars = {}
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (m) vars[m[1]] = m[2].trim()
  }
  return vars
}

/** Writes KEY=VALUE into `file`: replaces the existing line, or appends it. */
function upsert(file, updates, { headerForNew } = {}) {
  let src = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : ""
  const missing = []
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m")
    if (re.test(src)) src = src.replace(re, `${key}=${value}`)
    else missing.push(`${key}=${value}`)
  }
  if (missing.length) {
    if (!src.endsWith("\n") && src !== "") src += "\n"
    if (headerForNew) src += `\n# --- ${headerForNew} ---\n`
    src += missing.join("\n") + "\n"
  }
  fs.writeFileSync(file, src)
}

function ensureFromExample(file, example) {
  if (fs.existsSync(file)) return false
  fs.copyFileSync(path.join(ROOT, example), file)
  return true
}

const isSet = (v) =>
  v !== undefined &&
  v !== "" &&
  !/your-deployment|sk_test_\.\.\.|pk_test_\.\.\.|whsec_\.\.\.|sk-\.\.\./.test(v)

/**
 * Keys the template pre-fills with a safe value: they do NOT indicate that
 * an integration is enabled, and they never count as missing.
 */
const DEFAULT_KEYS = new Set([
  "AWS_REGION",
  "UBER_EATS_SANDBOX_MODE",
  "DELIVEROO_IS_SANDBOX",
  "PAYPAL_SANDBOX_MODE",
])

const signalKeys = (group) => group.keys.filter((k) => !DEFAULT_KEYS.has(k))

function groupStatus(vars, group) {
  const sig = signalKeys(group)
  const set = sig.filter((k) => isSet(vars[k]))
  if (set.length === 0) return "off"
  if (set.length === sig.length) return "ok"
  return "partial"
}

// ---------------------------------------------------------------------------

async function check({ quiet } = {}) {
  const web = parse(ENV_LOCAL)
  const convex = parse(ENV_CONVEX)
  const hasMobile = fs.existsSync(path.join(ROOT, "mobile"))
  let problems = 0

  if (!fs.existsSync(ENV_LOCAL)) {
    console.log("✗ .env.local absent — lancer `pnpm env:setup`")
    return 1
  }

  console.log("Requis (web) :")
  for (const key of REQUIRED) {
    const ok = isSet(web[key])
    if (!ok) problems++
    console.log(`  ${ok ? "✓" : "✗"} ${key}`)
  }

  console.log("\nIntégrations :")
  for (const group of GROUPS) {
    const st = groupStatus(web, group)
    if (st === "partial") {
      problems++
      const missing = signalKeys(group).filter((k) => !isSet(web[k]))
      console.log(`  ◐ ${group.name} — INCOMPLET : ${missing.join(", ")}`)
    } else {
      console.log(`  ${st === "ok" ? "✓" : "·"} ${group.name}${st === "off" ? " (inactif)" : ""}`)
    }
  }

  console.log("\nPropagation :")
  const convexDrift = CONVEX_KEYS.filter(
    (k) => isSet(web[k]) && convex[k] !== web[k],
  )
  if (!fs.existsSync(ENV_CONVEX)) {
    console.log("  ✗ .env.convex absent — `pnpm env:sync` puis `pnpm convex:env`")
    problems++
  } else if (convexDrift.length) {
    console.log(`  ✗ .env.convex désynchronisé (${convexDrift.length} clés : ${convexDrift.slice(0, 4).join(", ")}${convexDrift.length > 4 ? "…" : ""}) — \`pnpm env:sync\``)
    problems++
  } else {
    console.log("  ✓ .env.convex aligné (penser à `pnpm convex:env` après modif)")
  }

  if (hasMobile) {
    const mobile = parse(ENV_MOBILE)
    if (isSet(web.NEXT_PUBLIC_CONVEX_URL) && mobile.EXPO_PUBLIC_CONVEX_URL !== web.NEXT_PUBLIC_CONVEX_URL) {
      console.log("  ✗ mobile/.env : EXPO_PUBLIC_CONVEX_URL ≠ NEXT_PUBLIC_CONVEX_URL — `pnpm env:sync`")
      problems++
    } else {
      console.log("  ✓ mobile/.env aligné")
    }
  }

  // Official engine validation (Zod schemas from @be-in-digital/core) — the
  // authoritative layer when node_modules is installed; silent otherwise.
  try {
    for (const [k, v] of Object.entries(web)) {
      if (process.env[k] === undefined) process.env[k] = v
    }
    const { validateAllEnv, formatEnvReport } = await import(
      "@be-in-digital/core/env"
    )
    const { ok, missing } = validateAllEnv()
    if (ok) {
      console.log("\nValidation @be-in-digital/core : ✓")
    } else {
      problems += 1
      console.log("\nValidation @be-in-digital/core :")
      console.log(formatEnvReport(missing))
    }
  } catch {
    console.log(
      "\n(validation @be-in-digital/core indisponible — lancer pnpm install)",
    )
  }

  if (!quiet) {
    console.log(
      problems === 0
        ? "\nEnvironnement complet."
        : `\n${problems} point(s) à corriger.`,
    )
  }
  return problems === 0 ? 0 : 1
}

function sync() {
  if (!fs.existsSync(ENV_LOCAL)) {
    console.error(".env.local absent — lancer `pnpm env:setup` d'abord.")
    process.exit(1)
  }
  const web = parse(ENV_LOCAL)

  ensureFromExample(ENV_CONVEX, ".env.convex.example")
  const convexUpdates = {}
  for (const key of CONVEX_KEYS) {
    if (isSet(web[key])) convexUpdates[key] = web[key]
  }
  upsert(ENV_CONVEX, convexUpdates, { headerForNew: "Synchronisé depuis .env.local" })
  console.log(`✓ .env.convex : ${Object.keys(convexUpdates).length} clés propagées`)

  if (fs.existsSync(path.join(ROOT, "mobile"))) {
    if (isSet(web.NEXT_PUBLIC_CONVEX_URL)) {
      upsert(ENV_MOBILE, { EXPO_PUBLIC_CONVEX_URL: web.NEXT_PUBLIC_CONVEX_URL })
      console.log("✓ mobile/.env : EXPO_PUBLIC_CONVEX_URL alignée")
    } else {
      console.log("· mobile/.env : NEXT_PUBLIC_CONVEX_URL pas encore définie (lancer `pnpx convex dev`)")
    }
  }

  console.log("\nPousser côté backend : pnpm convex:env   (applique .env.convex via convex env set)")
}

async function setup() {
  const created = ensureFromExample(ENV_LOCAL, ".env.example")
  if (created) console.log("✓ .env.local créé depuis .env.example")
  const web = parse(ENV_LOCAL)

  // 1. Auto-generated secrets
  const generated = {}
  for (const [key, gen] of Object.entries(GENERATORS)) {
    if (!isSet(web[key])) {
      generated[key] = gen()
      web[key] = generated[key]
    }
  }
  if (Object.keys(generated).length) {
    upsert(ENV_LOCAL, generated)
    console.log(`✓ secrets générés : ${Object.keys(generated).join(", ")}`)
  }

  // Prompt that works with both a TTY AND piped stdin: lines are queued as
  // they arrive; after EOF, any remaining question resolves to "" (= default).
  // (Plain readline.question never resolves a question asked after the pipe
  // has closed.)
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
  const ask = async (q, fallback = "") => {
    process.stdout.write(`${q}${fallback ? ` (${fallback})` : ""} : `)
    const a = (await nextLine()).trim()
    if (!process.stdin.isTTY) process.stdout.write(`${a}\n`)
    return a || fallback
  }

  // 2. Missing required vars
  console.log("\n— Variables requises (Entrée = laisser vide / garder) —")
  const updates = {}
  for (const key of REQUIRED) {
    if (isSet(web[key])) continue
    if (key.startsWith("NEXT_PUBLIC_CONVEX") || key.startsWith("CONVEX")) {
      console.log(`  · ${key} : sera remplie par \`pnpx convex dev\``)
      continue
    }
    const def =
      key === "BETTER_AUTH_URL" || key === "SITE_URL" || key === "NEXT_PUBLIC_APP_URL"
        ? "http://localhost:3000"
        : ""
    const v = await ask(`  ${key}`, def)
    if (v) {
      updates[key] = v
      web[key] = v
    }
  }

  // 3. Integrations
  console.log("\n— Intégrations (activer ? y/N ; Entrée = garder la valeur) —")
  for (const group of GROUPS) {
    const st = groupStatus(web, group)
    const on = await ask(`${group.name}${st !== "off" ? " [déjà partiellement configurée]" : ""} — activer ?`, st === "off" ? "N" : "y")
    if (!/^y(es)?$/i.test(on)) continue
    for (const key of group.keys) {
      const v = await ask(`    ${key}`, web[key] || "")
      if (v && v !== web[key]) {
        updates[key] = v
        web[key] = v
      }
    }
  }
  rl.close()

  if (Object.keys(updates).length) upsert(ENV_LOCAL, updates)
  console.log(`\n✓ .env.local à jour (${Object.keys(updates).length} clés modifiées)`)

  // 4. Propagate to convex + mobile, then report the final state
  sync()
  console.log("")
  await check({ quiet: true })
}

// ---------------------------------------------------------------------------

const cmd = process.argv[2]
if (cmd === "check") process.exit(await check())
else if (cmd === "sync") sync()
else if (cmd === "setup") await setup()
else {
  console.error("Usage : env.mjs <setup|check|sync>")
  process.exit(1)
}
