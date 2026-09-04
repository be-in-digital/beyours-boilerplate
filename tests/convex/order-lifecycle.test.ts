// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * What happens to an order after — and instead of — the first click.
 *
 * A second click on "Payer" bought a second dinner: the button re-enables in
 * `finally` while the redirect to the provider is in flight, and the cart
 * survives a Back navigation. Cash was offered, accepted, and never recorded,
 * so the order stayed unpaid for ever. Cancelling one left its ticket live on
 * the kitchen display and "en préparation" on the customer's tracking page. And
 * the two settings that say what an establishment will take an order for — a
 * minimum, a radius — were written by the dashboard and read by nobody.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
import { api, internal } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000

/** Place de la Bastille, and an address 6 km away at the Arc de Triomphe. */
const BASTILLE = { latitude: 48.8532, longitude: 2.3692 }
const ETOILE = { latitude: 48.8738, longitude: 2.295 }

type Role = "super_admin" | "client_admin" | "manager" | "kitchen" | "customer"

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


async function seedStore(
  t: ReturnType<typeof convexTest>,
  address: Record<string, unknown> = {}
) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Chez Luigi",
      slug: "chez-luigi",
      address: {
        street: "1 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        country: "France",
        ...address,
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

async function seedGlobalSettings(
  t: ReturnType<typeof convexTest>,
  extra: Record<string, unknown> = {}
) {
  await t.run((ctx) =>
    ctx.db.insert("globalSettings", {
      currency: "EUR",
      timezone: "Europe/Paris",
      taxRate: 10,
      services: {
        dineIn: true,
        takeaway: true,
        delivery: true,
        clickAndCollect: true,
      },
      hours: [],
      delivery: {},
      integrations: {},
      updatedAt: NOW,
      ...extra,
    })
  )
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  subject: string,
  role: Role,
  storeIds: Id<"stores">[]
) {
  await t.run((ctx) =>
    ctx.db.insert("userProfiles", {
      userId: subject,
      role,
      storeIds,
      permissions: [],
      language: "fr",
      twoFactorEnabled: false,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
  return t.withIdentity({ subject })
}

async function seedProduct(
  t: ReturnType<typeof convexTest>,
  storeId: Id<"stores">,
  price = 1_200
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
    return ctx.db.insert("products", {
      storeId,
      categoryId,
      name: "Margherita",
      slug: "margherita",
      price,
      taxRate: 10,
      images: [],
      options: [],
      allergens: [],
      tags: [],
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
      source: "manual",
      createdAt: NOW,
      updatedAt: NOW,
    })
  })
}

function orderArgs(
  storeId: Id<"stores">,
  productId: Id<"products">,
  overrides: Record<string, unknown> = {},
  price = 1_200
) {
  return {
    storeId,
    customerInfo: { name: "Camille", email: "camille@example.com" },
    items: [
      {
        productId,
        productName: "Margherita",
        quantity: 1,
        unitPrice: price,
        selectedOptions: [],
        subtotal: price,
      },
    ],
    type: "pickup" as const,
    ...overrides,
  }
}


/**
 * Confirm the payment, which is what now puts the slip on the pass.
 *
 * The kitchen ticket used to be written inside checkout, before any provider
 * redirect — so an abandoned payment left the kitchen cooking (#136). These
 * tests are about what happens to a ticket, so they have to get one the way
 * the product now does.
 */
async function payOrder(
  t: ReturnType<typeof convexTest>,
  orderId: Id<"orders">
) {
  await t.run((ctx) =>
    ctx.runMutation(internal.orders.internalUpdatePaymentStatus, {
      id: orderId,
      paymentStatus: "paid" as const,
    })
  )
}

describe("a second click on Payer", () => {
  test("returns the order that already exists", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const args = orderArgs(storeId, productId, { idempotencyKey: "attempt-1" })

    const first = await t.mutation(api.orders.create, args)
    const second = await t.mutation(api.orders.create, args)

    expect(second).toBe(first)

    const orders = await t.run((ctx) => ctx.db.query("orders").collect())
    expect(orders).toHaveLength(1)
  })

  test("does not send a second ticket to the kitchen", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const args = orderArgs(storeId, productId, { idempotencyKey: "attempt-1" })

    const first = await t.mutation(api.orders.create, args)
    const second = await t.mutation(api.orders.create, args)

    // The replay returns the same order, and the payment confirms once.
    expect(second).toBe(first)
    await payOrder(t, first as Id<"orders">)

    const tickets = await t.run((ctx) => ctx.db.query("kitchenTickets").collect())
    expect(tickets).toHaveLength(1)
  })

  test("does not burn a second promotion usage", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const promotionId = await t.run((ctx) =>
      ctx.db.insert("promotions", {
        storeId,
        name: "Bienvenue",
        triggerMode: "coupon" as const,
        couponCode: "BIENVENUE",
        discountType: "percentage" as const,
        discountValue: 10,
        scope: "order" as const,
        startDate: NOW - 1_000,
        endDate: NOW + 100_000_000_000,
        isActive: true,
        usageCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
    )

    const args = orderArgs(storeId, productId, {
      idempotencyKey: "attempt-1",
      promotionId,
    })
    await t.mutation(api.orders.create, args)
    await t.mutation(api.orders.create, args)

    const promotion = await t.run((ctx) => ctx.db.get(promotionId))
    expect(promotion?.usageCount).toBe(1)
  })

  test("still lets the customer order twice on purpose", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)

    await t.mutation(
      api.orders.create,
      orderArgs(storeId, productId, { idempotencyKey: "attempt-1" })
    )
    await t.mutation(
      api.orders.create,
      orderArgs(storeId, productId, { idempotencyKey: "attempt-2" })
    )

    const orders = await t.run((ctx) => ctx.db.query("orders").collect())
    expect(orders).toHaveLength(2)
  })

  test("keys the replay to one establishment", async () => {
    // Two browsers, two restaurants, the same generated key: not the same order.
    const t = newHarness()
    await seedGlobalSettings(t)
    const a = await seedStore(t)
    const b = await seedStore(t)
    const productA = await seedProduct(t, a)
    const productB = await seedProduct(t, b)

    await t.mutation(
      api.orders.create,
      orderArgs(a, productA, { idempotencyKey: "same-key" })
    )
    await t.mutation(
      api.orders.create,
      orderArgs(b, productB, { idempotencyKey: "same-key" })
    )

    const orders = await t.run((ctx) => ctx.db.query("orders").collect())
    expect(orders).toHaveLength(2)
  })
})

describe("cash taken at the counter", () => {
  test("is recorded as a payment and marks the order paid", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const orderId = await t.mutation(
      api.orders.create,
      orderArgs(storeId, productId, { paymentMethod: "cash" })
    )
    const asManager = await seedUser(t, "user:m1", "manager", [storeId])

    await asManager.mutation(api.orders.markCashPaid, {
      orderId: orderId as Id<"orders">,
    })

    const order = await t.run((ctx) => ctx.db.get(orderId as Id<"orders">))
    expect(order?.paymentStatus).toBe("paid")

    const payments = await t.run((ctx) => ctx.db.query("payments").collect())
    expect(payments).toHaveLength(1)
    expect(payments[0]?.provider).toBe("cash")
    expect(payments[0]?.status).toBe("succeeded")
    expect(payments[0]?.amount).toBe(order?.total)
  })

  test("does not double-count two members of staff pressing the button", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const orderId = await t.mutation(
      api.orders.create,
      orderArgs(storeId, productId, { paymentMethod: "cash" })
    )
    const asManager = await seedUser(t, "user:m1", "manager", [storeId])

    await asManager.mutation(api.orders.markCashPaid, {
      orderId: orderId as Id<"orders">,
    })
    await asManager.mutation(api.orders.markCashPaid, {
      orderId: orderId as Id<"orders">,
    })

    const payments = await t.run((ctx) => ctx.db.query("payments").collect())
    expect(payments).toHaveLength(1)
  })

  test("is refused to a customer", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const orderId = await t.mutation(
      api.orders.create,
      orderArgs(storeId, productId, { paymentMethod: "cash" })
    )
    const asCustomer = await seedUser(t, "user:c1", "customer", [])

    await expect(
      asCustomer.mutation(api.orders.markCashPaid, {
        orderId: orderId as Id<"orders">,
      })
    ).rejects.toThrow(/Access denied|access/i)
  })
})

describe("cancelling an order", () => {
  test("closes the ticket the kitchen is looking at", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const orderId = await t.mutation(api.orders.create, orderArgs(storeId, productId))
    await payOrder(t, orderId as Id<"orders">)
    const asManager = await seedUser(t, "user:m1", "manager", [storeId])

    await asManager.mutation(api.orders.updateStatus, {
      id: orderId as Id<"orders">,
      status: "cancelled" as const,
      cancellationReason: "Le client a changé d’avis",
    })

    const tickets = await t.run((ctx) => ctx.db.query("kitchenTickets").collect())
    expect(tickets[0]?.status).toBe("cancelled")
  })

  test("leaves a ticket the kitchen already finished alone", async () => {
    const t = newHarness()
    await seedGlobalSettings(t)
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId)
    const orderId = await t.mutation(api.orders.create, orderArgs(storeId, productId))
    await payOrder(t, orderId as Id<"orders">)
    const asManager = await seedUser(t, "user:m1", "manager", [storeId])

    const ticket = await t.run(async (ctx) => {
      const found = await ctx.db.query("kitchenTickets").first()
      await ctx.db.patch(found!._id, { status: "completed" as const })
      return found!._id
    })

    await asManager.mutation(api.orders.updateStatus, {
      id: orderId as Id<"orders">,
      status: "cancelled" as const,
    })

    const after = await t.run((ctx) => ctx.db.get(ticket))
    expect(after?.status).toBe("completed")
  })
})

describe("what the establishment will take an order for", () => {
  test("refuses a basket below the minimum", async () => {
    const t = newHarness()
    await seedGlobalSettings(t, { minimumOrderAmount: 1_500 })
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId, 330)

    await expect(
      t.mutation(api.orders.create, orderArgs(storeId, productId, {}, 330))
    ).rejects.toThrow(/15,00 €/)
  })

  test("accepts one that reaches it", async () => {
    const t = newHarness()
    await seedGlobalSettings(t, { minimumOrderAmount: 1_500 })
    const storeId = await seedStore(t)
    const productId = await seedProduct(t, storeId, 1_500)

    await expect(
      t.mutation(api.orders.create, orderArgs(storeId, productId, {}, 1_500))
    ).resolves.toBeTruthy()
  })

  test("refuses a delivery beyond the radius", async () => {
    const t = newHarness()
    await seedGlobalSettings(t, { delivery: { radius: 3 } })
    const storeId = await seedStore(t, BASTILLE)
    const productId = await seedProduct(t, storeId)

    await expect(
      t.mutation(
        api.orders.create,
        orderArgs(storeId, productId, {
          type: "delivery" as const,
          deliveryAddress: {
            street: "1 place Charles de Gaulle",
            city: "Paris",
            postalCode: "75008",
            country: "France",
            ...ETOILE,
          },
        })
      )
    ).rejects.toThrow(/zone de livraison/)
  })

  test("accepts one inside it", async () => {
    const t = newHarness()
    await seedGlobalSettings(t, { delivery: { radius: 10 } })
    const storeId = await seedStore(t, BASTILLE)
    const productId = await seedProduct(t, storeId)

    await expect(
      t.mutation(
        api.orders.create,
        orderArgs(storeId, productId, {
          type: "delivery" as const,
          deliveryAddress: {
            street: "1 place Charles de Gaulle",
            city: "Paris",
            postalCode: "75008",
            country: "France",
            ...ETOILE,
          },
        })
      )
    ).resolves.toBeTruthy()
  })

  test("leaves a pickup order alone, however far the customer lives", async () => {
    const t = newHarness()
    await seedGlobalSettings(t, { delivery: { radius: 1 } })
    const storeId = await seedStore(t, BASTILLE)
    const productId = await seedProduct(t, storeId)

    await expect(
      t.mutation(api.orders.create, orderArgs(storeId, productId))
    ).resolves.toBeTruthy()
  })
})
