/**
 * Seed script to create test users via Better Auth API + Convex userProfiles.
 *
 * All emails use @beindigital.fr with "test." prefix to identify test accounts.
 *
 * Prerequisites:
 *   - Next.js dev server running (pnpm dev)
 *   - Convex dev running (pnpx convex dev)
 *
 * Usage:
 *   cd apps/restaurant-theme
 *   npx tsx scripts/seed-users.mts
 */

import { ConvexHttpClient } from "convex/browser"
import { anyApi } from "convex/server"
import type { FunctionReference } from "convex/server"

const api = anyApi as Record<string, Record<string, FunctionReference<"mutation" | "query" | "action", "public", Record<string, unknown>, unknown>>>

// ── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

// Never hardcode the deployment URL or passwords. Both come from the environment
// (.env.local for local dev, GitHub Secrets in CI). SEED_PASSWORD is for throwaway
// test accounts only — never reuse a real password.
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? ""

if (!CONVEX_URL) {
  console.error("NEXT_PUBLIC_CONVEX_URL is required (set it in .env.local). Aborting.")
  process.exit(1)
}
if (!SEED_PASSWORD) {
  console.error(
    "SEED_PASSWORD is required (set it in .env.local — test accounts only). Aborting."
  )
  process.exit(1)
}

type UserRole =
  | "client_admin"
  | "manager"
  | "kitchen"
  | "waiter"
  | "customer"

interface SeedUser {
  name: string
  email: string
  password: string
  role: UserRole
}

// All test accounts share the SEED_PASSWORD supplied via the environment.
const SEED_USERS: SeedUser[] = [
  // Owner
  {
    name: "Mamadou Seck",
    email: "test.owner@beindigital.fr",
    password: SEED_PASSWORD,
    role: "client_admin",
  },
  // Team members
  {
    name: "Marie Martin",
    email: "test.manager@beindigital.fr",
    password: SEED_PASSWORD,
    role: "manager",
  },
  {
    name: "Pierre Dupont",
    email: "test.cuisine@beindigital.fr",
    password: SEED_PASSWORD,
    role: "kitchen",
  },
  {
    name: "Sophie Laurent",
    email: "test.service@beindigital.fr",
    password: SEED_PASSWORD,
    role: "waiter",
  },
  // Regular customers
  {
    name: "Jean Durand",
    email: "test.client1@beindigital.fr",
    password: SEED_PASSWORD,
    role: "customer",
  },
  {
    name: "Camille Moreau",
    email: "test.client2@beindigital.fr",
    password: SEED_PASSWORD,
    role: "customer",
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

async function signUpUser(
  user: SeedUser
): Promise<{ id: string; email: string; name: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        password: user.password,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error(`  [SKIP] ${user.email} - HTTP ${res.status}:`, data?.message ?? data)
      return null
    }

    if (data.user) {
      console.log(`  [OK]   ${user.email} -> id: ${data.user.id}`)
      return { id: data.user.id, email: data.user.email, name: data.user.name }
    }

    if (data.id) {
      console.log(`  [OK]   ${user.email} -> id: ${data.id}`)
      return { id: data.id, email: data.email, name: data.name }
    }

    console.error(`  [SKIP] ${user.email} - Unexpected response:`, JSON.stringify(data))
    return null
  } catch (err) {
    console.error(`  [ERR]  ${user.email} -`, err)
    return null
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== BeYours Engine - Test User Seeding ===\n")
  console.log(`Better Auth URL: ${BASE_URL}`)
  console.log(`Convex URL: ${CONVEX_URL}\n`)

  // Step 1: Create users via Better Auth sign-up API
  console.log("Step 1: Creating users via Better Auth...\n")

  const createdUsers: { user: { id: string; email: string; name: string }; role: UserRole }[] = []

  for (const seedUser of SEED_USERS) {
    const user = await signUpUser(seedUser)
    if (user) {
      createdUsers.push({ user, role: seedUser.role })
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 500))
  }

  if (createdUsers.length === 0) {
    console.log("\nNo users were created. They may already exist. Exiting.")
    return
  }

  console.log(`\n${createdUsers.length}/${SEED_USERS.length} users created.\n`)

  // Step 2: Create userProfiles in Convex
  console.log("Step 2: Creating userProfiles in Convex...\n")

  const convex = new ConvexHttpClient(CONVEX_URL)

  const userProfilesApi = api.userProfiles
  if (!userProfilesApi || !userProfilesApi.upsert) {
    console.error("userProfiles API not available")
    return
  }

  for (const { user, role } of createdUsers) {
    try {
      // Type assertion needed for dynamically loaded API
      await convex.mutation(userProfilesApi.upsert as FunctionReference<"mutation">, {
        userId: user.id,
        role,
        storeIds: [],
        permissions: [],
        language: "fr",
      })
      console.log(`  [OK]   Profile for ${user.email} (${role})`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  [ERR]  Profile for ${user.email}:`, message)
    }
  }

  console.log("\n=== Seeding complete! ===\n")

  console.log("Test users summary:")
  console.log("-".repeat(75))
  console.log(`  ${"Name".padEnd(20)} ${"Email".padEnd(35)} Role`)
  console.log("-".repeat(75))
  for (const { user, role } of createdUsers) {
    console.log(`  ${user.name.padEnd(20)} ${user.email.padEnd(35)} ${role}`)
  }
  console.log("-".repeat(75))
  console.log("\nAll accounts use the password from the SEED_PASSWORD env var.")
}

main().catch(console.error)
