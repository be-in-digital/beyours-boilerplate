// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * The anonymous prize drain (#323, source card NEW-N).
 *
 * `gamePlay.play` is public and anonymous on purpose — the whole product is a
 * diner scanning a QR code at a table — and its only fairness mechanism was a
 * 24h cooldown keyed on `args.fingerprint`, a string the browser sends. So the
 * loop below used to empty a restaurant's prize budget: 40 calls changing
 * nothing but that string, 0 refused, a five-prize stock at zero.
 *
 * These tests drive the real public mutation through the real schema and the
 * real `rateLimits` table, because that is the seam the card measured. The
 * unit suite in `packages/convex-functions` calls the same handlers past a
 * hand-rolled `db` mock, which cannot show that the limiter's index exists.
 *
 * Read the third case before changing any number here: it asserts what this
 * fix does NOT do.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000

const harnesses: ReturnType<typeof convexTest>[] = []

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

afterEach(async () => {
  for (const t of harnesses) {
    await t.run(async (ctx) => {
      const pending = await ctx.db.system.query("_scheduled_functions").collect()
      for (const job of pending) {
        if (job.state.kind === "pending") await ctx.scheduler.cancel(job._id)
      }
    })
  }
  harnesses.length = 0
})

/**
 * A restaurant running a wheel that always wins, with a five-prize budget.
 *
 * The store goes through `stores.create` rather than a hand-built row: the
 * table has required fields a fixture forgets, and the point of an app-level
 * test is to stop guessing at them.
 */
async function seedGame(t: ReturnType<typeof convexTest>, prizeStock = 5) {
  await t.run((ctx) =>
    ctx.db.insert("userProfiles", {
      userId: "marie",
      role: "client_admin",
      storeIds: [],
      permissions: [],
      language: "fr",
      twoFactorEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
  const marie = t.withIdentity({ subject: "marie" })
  const storeId: Id<"stores"> = await marie.mutation(api.stores.create, {
    name: "Pizzeria Napoli",
    slug: "pizzeria-napoli",
    description: "Napolitaine au feu de bois",
    address: {
      street: "12 rue Oberkampf",
      city: "Paris",
      postalCode: "75011",
      country: "France",
    },
    phone: "+33145678901",
    email: "napoli@example.com",
  })

  return await t.run(async (ctx) => {
    await ctx.db.insert("gameQRCodes", {
      storeId,
      code: "TABLE1",
      isActive: true,
      scannedCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const gameId: Id<"games"> = await ctx.db.insert("games", {
      storeId,
      type: "wheel",
      name: "Roue de la chance",
      winRatio: 100,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const prizeId: Id<"prizes"> = await ctx.db.insert("prizes", {
      storeId,
      name: "Pizza offerte",
      type: "free_product",
      validityDays: 7,
      remainingCount: prizeStock,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    return { storeId, gameId, prizeId }
  })
}


describe("the drain the card measured, run against the real backend", () => {
  test("40 anonymous plays rotating the fingerprint are refused past the window", async () => {
    const t = newHarness()
    const { gameId, prizeId } = await seedGame(t)

    let refused = 0
    let admitted = 0
    for (let i = 0; i < 40; i++) {
      try {
        await t.mutation(api.gamePlay.play, {
          code: "TABLE1",
          gameId,
          // The only thing that changes, and the only thing that used to matter.
          fingerprint: `drain-${i}`,
          completedActions: [],
        })
        admitted++
      } catch {
        refused++
      }
    }

    // Before #323: admitted 40, refused 0.
    expect(admitted).toBe(10)
    expect(refused).toBe(30)

    const plays = await t.run((ctx) => ctx.db.query("gamePlays").collect())
    expect(plays).toHaveLength(10)

    // The limiter wrote through the real index, not a mock.
    const limits = await t.run((ctx) => ctx.db.query("rateLimits").collect())
    expect(limits.some((r) => r.key.startsWith("gamePlayPerQr:"))).toBe(true)
    expect(limits.some((r) => r.key.startsWith("gamePlayPerStore:"))).toBe(true)

    // eslint-disable-next-line no-console
    console.log({
      attempts: 40,
      admitted,
      refused,
      stockAfter: (await t.run((ctx) => ctx.db.get(prizeId)))?.remainingCount,
    })
  })

  test("the window survives a caller changing every argument it controls", async () => {
    const t = newHarness()
    const { gameId } = await seedGame(t, 100)

    for (let i = 0; i < 10; i++) {
      await t.mutation(api.gamePlay.play, {
        code: "TABLE1",
        gameId,
        fingerprint: `f-${i}`,
        completedActions: [`invented-${i}`],
        userAgent: `UA-${i}`,
      })
    }

    await expect(
      t.mutation(api.gamePlay.play, {
        code: "TABLE1",
        gameId,
        fingerprint: "brand-new",
        completedActions: [],
      })
    ).rejects.toThrow()
  })

  test("what this does NOT fix: the stock still empties at the permitted rate", async () => {
    const t = newHarness()
    const { gameId, prizeId } = await seedGame(t, 5)

    for (let i = 0; i < 5; i++) {
      await t.mutation(api.gamePlay.play, {
        code: "TABLE1",
        gameId,
        fingerprint: `taker-${i}`,
        completedActions: [],
      })
    }

    // Five plays inside one window, five prizes gone, all to one caller. The
    // limiter bounds the RATE, not the budget, and nothing here can tell one
    // person sending five fingerprints from five diners. Lowering the window
    // far enough to protect the stock would refuse real players first; binding
    // a play to a person needs a control this platform does not have.
    // Pinned so nobody reads #323 as "the prize budget is now safe".
    const prize = await t.run((ctx) => ctx.db.get(prizeId))
    expect(prize?.remainingCount).toBe(0)
  })

  test("only real action ids are stored, however many the caller invents", async () => {
    const t = newHarness()
    const { storeId, gameId } = await seedGame(t)

    const actionId = await t.run((ctx) =>
      ctx.db.insert("requiredActions", {
        storeId,
        type: "google_review",
        name: "Avis Google",
        isRequired: true,
        sortOrder: 0,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )

    await t.mutation(api.gamePlay.play, {
      code: "TABLE1",
      gameId,
      fingerprint: "device-1",
      completedActions: [
        actionId,
        actionId,
        "requiredActions:never-existed",
        "x".repeat(500),
      ],
    })

    const play = await t.run((ctx) => ctx.db.query("gamePlays").first())
    // Written verbatim before #323 — unbounded array, unbounded strings.
    expect(play?.completedActions).toEqual([actionId])
  })
})
