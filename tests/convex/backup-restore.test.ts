// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * A restored backup keeps its catalogue attached to its establishment (#224).
 *
 * `importTable` deletes a table and re-inserts its rows without their `_id` —
 * Convex will not let an insert choose one. So `stores` came back under **new**
 * ids while the products, menus, CMS pages and promotions restored after them
 * came back carrying the **old** `storeId`. Nothing objected: on a real
 * deployment `v.id("stores")` validates how an id is encoded, not that it
 * resolves. The deployment came up with every catalogue detached from its
 * establishment, and the owner's `userProfiles.storeIds` naming stores that no
 * longer existed — so they were locked out of every screen. Silently, and
 * irreversibly.
 *
 * Every id here is one this deployment actually issued: the fixture is seeded,
 * read back the way `exportTable` reads it, and fed to the import. That is the
 * real cycle, and it is the only way the ids survive the schema validator.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
import { internal } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

const harnesses: ReturnType<typeof convexTest>[] = []

/**
 * Cancel whatever the test left on the scheduler.
 *
 * Product, menu and store mutations queue work through `ctx.scheduler.runAfter`
 * — `scheduleMenuSync` puts the Uber Eats and Deliveroo syncs at a 5s delay on
 * every catalogue write. A test finishes in milliseconds and leaves them
 * pending; whatever fires them next writes against a transaction that closed,
 * and because nothing awaits it that arrives as an unhandled rejection. The run
 * then reports every test green and still exits 1, blaming whichever file
 * happened to be running rather than the one that queued the work.
 *
 * Cancel rather than run. `syncAllStores` is an `internalAction`, and running
 * one here is the disease, not the cure: convex-test patches its
 * `_scheduled_functions` row on completion, an action has no transaction to
 * patch it in, and the failure comes straight back. Finishing the queue with
 * `finishAllScheduledFunctions` was tried first and made it worse — ten
 * rejections in a run where leaving the jobs alone produced two.
 */
afterEach(async () => {
  for (const t of harnesses) {
    await t.run(async (ctx) => {
      const pending = await ctx.db.system.query("_scheduled_functions").collect()
      for (const job of pending) {
        // Only what is still outstanding: cancelling a job that already
        // finished is not a no-op. Same guard as `cancelScheduled` in
        // campaign-send.test.ts, which reached this from the other direction.
        if (job.state.kind === "pending" || job.state.kind === "inProgress") {
          await ctx.scheduler.cancel(job._id)
        }
      }
    })
  }
  harnesses.length = 0
})


async function seedStore(t: ReturnType<typeof convexTest>, name: string) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      address: {
        street: "12 rue Oberkampf",
        city: "Paris",
        postalCode: "75011",
        country: "France",
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

async function seedCatalogue(
  t: ReturnType<typeof convexTest>,
  storeId: Id<"stores">
) {
  return t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      storeId,
      name: "Pizzas",
      slug: "pizzas",
      sortOrder: 0,
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const productId = await ctx.db.insert("products", {
      storeId,
      categoryId,
      name: "Margherita",
      slug: "margherita",
      price: 1200,
      taxRate: 10,
      images: [],
      options: [],
      allergens: [],
      tags: [],
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
      source: "manual" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
    return { categoryId, productId }
  })
}

/** What `exportTable` writes into the backup file: whole rows, `_id` included. */
async function exportTables(
  t: ReturnType<typeof convexTest>,
  tables: readonly ("stores" | "categories" | "products")[]
) {
  const data: Record<string, Record<string, unknown>[]> = {}
  for (const table of tables) {
    data[table] = await t.run((ctx) => ctx.db.query(table).collect())
  }
  return data
}

/** Run the restore the way `system.importBackup` does: in dependency order. */
async function restore(
  t: ReturnType<typeof convexTest>,
  data: Record<string, Record<string, unknown>[]>
) {
  const idMap: Record<string, string> = {}

  for (const tableName of ["stores", "categories", "products"] as const) {
    const rows = data[tableName]
    if (!rows) continue
    const result = await t.mutation(internal.systemInternal.importTable, {
      tableName,
      rows,
      idMap,
    })
    Object.assign(idMap, result.idMap)
  }

  const profiles = await t.mutation(internal.systemInternal.remapProfileStores, {
    idMap,
  })

  return { idMap, profiles }
}

// ============================================================================

describe("restoring a backup", () => {
  test("re-points the catalogue at the establishment it came back as", async () => {
    // The defect itself: the store gets a new id, and the catalogue has to
    // follow it rather than keep naming the one from the file.
    const t = newHarness()
    const storeId = await seedStore(t, "Pizzeria Napoli")
    await seedCatalogue(t, storeId)
    const backup = await exportTables(t, ["stores", "categories", "products"])

    await restore(t, backup)

    const { store, category, product } = await t.run(async (ctx) => ({
      store: (await ctx.db.query("stores").collect())[0],
      category: (await ctx.db.query("categories").collect())[0],
      product: (await ctx.db.query("products").collect())[0],
    }))

    expect(store?._id).not.toBe(storeId)
    expect(category?.storeId).toBe(store?._id)
    expect(product?.storeId).toBe(store?._id)
    expect(product?.categoryId).toBe(category?._id)
  })

  test("leaves the restored product reachable from its store", async () => {
    // Not merely "the ids agree" — the index the app queries through has to
    // find it. A detached catalogue is invisible, not mislabelled.
    const t = newHarness()
    const storeId = await seedStore(t, "Pizzeria Napoli")
    await seedCatalogue(t, storeId)
    const backup = await exportTables(t, ["stores", "categories", "products"])

    await restore(t, backup)

    const found = await t.run(async (ctx) => {
      const store = (await ctx.db.query("stores").collect())[0]
      return ctx.db
        .query("products")
        .withIndex("by_storeId", (q) => q.eq("storeId", store!._id))
        .collect()
    })

    expect(found.map((p) => p.name)).toEqual(["Margherita"])
  })

  test("keeps the owner's access to the establishment", async () => {
    // `userProfiles` is not in the backup — it holds identities, not restaurant
    // data — so its `storeIds` still name the pre-restore ids. Left alone,
    // every store-scoped screen refuses the person who just ran the restore.
    const t = newHarness()
    const storeId = await seedStore(t, "Pizzeria Napoli")
    await t.run((ctx) =>
      ctx.db.insert("userProfiles", {
        userId: "marie",
        role: "client_admin",
        storeIds: [storeId],
        permissions: [],
        language: "fr",
        twoFactorEnabled: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )
    const backup = await exportTables(t, ["stores"])

    await restore(t, backup)

    const { profile, store } = await t.run(async (ctx) => ({
      profile: (await ctx.db.query("userProfiles").collect())[0],
      store: (await ctx.db.query("stores").collect())[0],
    }))

    expect(profile?.storeIds).toEqual([store?._id])
  })

  test("drops a profile's reference to a store the backup did not contain", async () => {
    // Keeping it would put back exactly the dangling id this change removes:
    // after the import that establishment does not exist.
    const t = newHarness()
    const kept = await seedStore(t, "Pizzeria Napoli")
    const backup = await exportTables(t, ["stores"])
    const gone = await seedStore(t, "Pizzeria Roma")
    await t.run((ctx) =>
      ctx.db.insert("userProfiles", {
        userId: "marie",
        role: "client_admin",
        storeIds: [kept, gone],
        permissions: [],
        language: "fr",
        twoFactorEnabled: false,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )

    const { profiles } = await restore(t, backup)

    const profile = await t.run(
      async (ctx) => (await ctx.db.query("userProfiles").collect())[0]
    )
    expect(profile?.storeIds).toHaveLength(1)
    expect(profiles.dropped).toBe(1)
  })

  test("leaves a reference the backup did not carry rather than inventing one", async () => {
    // A file holding one establishment and the products of two. The second
    // store's products name an id the map never learned, and there is nothing
    // to rewrite them to. Guessing would be worse than leaving them: the map is
    // the only authority on what an id became.
    const t = newHarness()
    const kept = await seedStore(t, "Pizzeria Napoli")
    await seedCatalogue(t, kept)
    const other = await seedStore(t, "Pizzeria Roma")
    await seedCatalogue(t, other)

    const all = await exportTables(t, ["stores", "categories", "products"])
    const backup = {
      stores: all.stores!.filter((s) => s._id === kept),
      categories: all.categories!.filter((c) => c.storeId === kept),
      products: all.products!,
    }

    await restore(t, backup)

    const { store, products } = await t.run(async (ctx) => ({
      store: (await ctx.db.query("stores").collect())[0],
      products: await ctx.db.query("products").collect(),
    }))

    // Both products were restored; only the one whose store was in the file
    // follows it. The other keeps naming a store this deployment no longer has —
    // the honest outcome, and the one the restore's message warns about.
    expect(products).toHaveLength(2)
    expect(products.filter((p) => p.storeId === store?._id)).toHaveLength(1)
  })

  test("still clears the table it is importing into", async () => {
    // The behaviour that was already there and must not regress: a restore
    // replaces, it does not append.
    const t = newHarness()
    const storeId = await seedStore(t, "Pizzeria Napoli")
    const backup = await exportTables(t, ["stores"])
    await seedStore(t, "Ajoutee Apres")
    expect(storeId).toBeDefined()

    await restore(t, backup)

    const stores = await t.run((ctx) => ctx.db.query("stores").collect())
    expect(stores.map((s) => s.name)).toEqual(["Pizzeria Napoli"])
  })
})
