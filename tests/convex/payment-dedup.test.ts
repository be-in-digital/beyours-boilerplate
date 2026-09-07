// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * One provider charge is one payment row.
 *
 * THE BUG: two writers settle the same Stripe charge from two different events
 * — the return page (`stripe.verifyCheckoutSession`) and the webhook
 * (`stripeWebhook.handleWebhook`). Each read `order.paymentStatus !== "paid"`
 * and then wrote, in separate transactions, so the loser of that race still
 * inserted. `by_externalId` existed on the payments table and a repository-wide
 * search found exactly one reference to it: its own definition.
 *
 * Every call site wrapped the insert in `try {} catch {}` under the comment
 * "Payment record may already exist". That comment was false — `db.insert` has
 * no duplicate to throw on — and the four `catch` blocks caught nothing.
 *
 * The consequence was not cosmetic: `planRefund` validates each row against its
 * OWN amount, so one 48 € charge recorded twice offered 96 € of refundable
 * balance. That is money out of the restaurant's account.
 *
 * These run the real Convex functions against the real schema, in memory.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
import { internal } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"
import { planRefund } from "@be-in-digital/convex-functions/refundPolicy"
import {
  assertSettlesOrder,
  paymentStatusAfterSettlement,
} from "@be-in-digital/convex-functions/paymentSettlement"
import {
  abandonedCheckoutSession,
  markCashPaid,
} from "@be-in-digital/convex-functions/orders"

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000
/** 48 € in cents — the charge whose duplicate offered 96 € back. */
const CHARGE = 4_800
const INTENT = "pi_3PfakeChargeIntent"

const harnesses: ReturnType<typeof convexTest>[] = []

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

/**
 * Cancel whatever the test left on the scheduler.
 *
 * Catalogue and store mutations queue menu syncs through `ctx.scheduler`. A
 * test finishes in milliseconds and leaves them pending; whatever fires them
 * next writes against a closed transaction, and because nothing awaits it that
 * arrives as an unhandled rejection — the run then reports every test green and
 * still exits 1, blaming whichever file happened to be running. Same block as
 * `authorization.test.ts`.
 */
afterEach(async () => {
  for (const t of harnesses) {
    // Let whatever is already RUNNING finish first.
    //
    // The loop below cancels `inProgress` jobs as well as pending ones, and
    // cancelling a job mid-run is what `convexTest` raises
    // "Unexpected scheduled function state after it finished running: canceled"
    // over — an unhandled rejection that turns a fully green run red, blaming
    // whichever file happened to be executing rather than the one that queued
    // the work. It stayed hidden while the only scheduled work was the 5s menu
    // sync, which is always still `pending`; the order confirmation goes on at
    // `runAfter(0)` from every payment path, so under parallel load it is
    // routinely mid-flight when this runs.
    //
    // `finishInProgressScheduledFunctions`, not `finishAllScheduledFunctions`:
    // the second one advances the clock and fires the delayed menu syncs, which
    // is the disease the comment above describes. This one only waits for what
    // was already running.
    await t.finishInProgressScheduledFunctions()
    await t.run(async (ctx) => {
      const pending = await ctx.db.system.query("_scheduled_functions").collect()
      for (const job of pending) {
        if (job.state.kind === "pending" || job.state.kind === "inProgress") {
          await ctx.scheduler.cancel(job._id)
        }
      }
    })
  }
  harnesses.length = 0
})

async function seedStore(t: ReturnType<typeof convexTest>) {
  return t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Chez Probe",
      slug: "chez-probe",
      address: {
        street: "1 rue de la Paix",
        city: "Paris",
        postalCode: "75002",
        country: "France",
      },
      hours: [],
      status: "open" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

async function seedOrder(
  t: ReturnType<typeof convexTest>,
  storeId: Id<"stores">,
  orderNumber: string,
  total = CHARGE
) {
  return t.run((ctx) =>
    ctx.db.insert("orders", {
      storeId,
      orderNumber,
      customerInfo: { name: "Camille" },
      items: [],
      type: "pickup" as const,
      status: "pending" as const,
      subtotal: total,
      taxAmount: 0,
      total,
      paymentStatus: "pending" as const,
      source: "website" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })
  )
}

function settlement(storeId: Id<"stores">, orderId: Id<"orders">, externalId = INTENT) {
  return {
    storeId,
    orderId,
    amount: CHARGE,
    currency: "EUR",
    provider: "stripe" as const,
    externalId,
  }
}

async function paymentsFor(t: ReturnType<typeof convexTest>, orderId: Id<"orders">) {
  return t.run((ctx) =>
    ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect()
  )
}

describe("settling one charge twice", () => {
  test("writes one row, and says so", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-001")

    // The webhook, then the return page — or the other way round; the point is
    // that these are two different events about one charge.
    const first = await t.mutation(
      internal.payments.internalSettle,
      settlement(storeId, orderId)
    )
    const second = await t.mutation(
      internal.payments.internalSettle,
      settlement(storeId, orderId)
    )

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.paymentId).toBe(first.paymentId)
    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })

  test("leaves 48 € refundable, not 96 €", async () => {
    // The money question, stated as money. Before the fix this summed to 9600.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-002")

    await t.mutation(internal.payments.internalSettle, settlement(storeId, orderId))
    await t.mutation(internal.payments.internalSettle, settlement(storeId, orderId))

    const rows = await paymentsFor(t, orderId)
    const refundable = rows.reduce(
      (sum, row) =>
        sum +
        planRefund({
          payment: {
            provider: row.provider,
            status: row.status,
            amount: row.amount,
            refundedAmount: row.refundedAmount,
            externalId: row.externalId,
          },
          amount: row.amount,
        }).amount,
      0
    )

    expect(refundable).toBe(CHARGE)
  })
})

describe("what a settlement refuses", () => {
  test("refuses one charge settling a second order", async () => {
    // The replay: the same provider reference presented against a different
    // order. `by_externalId` is deliberately SINGLE-field — one provider charge
    // is one row, whatever order claims it. A compound (orderId, externalId)
    // index would read this as a miss and insert.
    const t = newHarness()
    const storeId = await seedStore(t)
    const paidOrder = await seedOrder(t, storeId, "A-003")
    const otherOrder = await seedOrder(t, storeId, "A-004")

    await t.mutation(internal.payments.internalSettle, settlement(storeId, paidOrder))

    await expect(
      t.mutation(internal.payments.internalSettle, settlement(storeId, otherOrder))
    ).rejects.toThrow(/règle déjà la commande/)

    expect(await paymentsFor(t, otherOrder)).toHaveLength(0)
  })

  test("refuses a settlement with no provider reference", async () => {
    // `externalId` is optional on the table because cash has none, and
    // `q.eq("externalId", undefined)` would match every cash payment ever
    // taken. A settlement without a reference can be neither deduplicated nor
    // refunded through the provider, so it is refused rather than stored.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-005")

    for (const empty of ["", "   "]) {
      await expect(
        t.mutation(internal.payments.internalSettle, settlement(storeId, orderId, empty))
      ).rejects.toThrow(/référence de transaction/)
    }

    expect(await paymentsFor(t, orderId)).toHaveLength(0)
  })

  test("refuses a non-positive amount", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-006")

    await expect(
      t.mutation(internal.payments.internalSettle, {
        ...settlement(storeId, orderId),
        amount: 0,
      })
    ).rejects.toThrow(/positive/)
  })
})

describe("the row a settlement leaves", () => {
  test("lands succeeded, with no pending state for anyone to observe", async () => {
    // The old path was `internalCreate` (status "pending") followed by
    // `internalUpdateStatus` — two mutations, so two transactions. When the
    // second never landed the row sat at "pending" for good, and a real
    // payment could not be refunded. One mutation means there is no instant at
    // which a caller could read this row as pending.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-007")

    const { paymentId } = await t.mutation(
      internal.payments.internalSettle,
      settlement(storeId, orderId)
    )

    const row = await t.run((ctx) => ctx.db.get(paymentId))
    expect(row?.status).toBe("succeeded")
    expect(row?.externalId).toBe(INTENT)
    expect(row?.amount).toBe(CHARGE)
    // Inserted in this state, never patched into it.
    expect(row?.createdAt).toBe(row?.updatedAt)
  })

  test("trims the provider reference it stores", async () => {
    // Otherwise " pi_x" and "pi_x" are two charges as far as the index is
    // concerned, and the deduplication silently stops working.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-008")

    await t.mutation(
      internal.payments.internalSettle,
      settlement(storeId, orderId, `  ${INTENT}  `)
    )
    const second = await t.mutation(
      internal.payments.internalSettle,
      settlement(storeId, orderId)
    )

    expect(second.created).toBe(false)
    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })
})

describe("a settlement arriving after cancellation", () => {
  /**
   * The sequence the four provider paths run, replayed here.
   *
   * They are all `"use node"` and dynamically import provider SDKs, so none of
   * them loads under `edge-runtime`. `settlement-binding.test.ts` asserts
   * against the source that all four really do run these two steps in this
   * order; this proves the steps produce the right state.
   */
  async function settleThroughTheCallSitePath(
    t: ReturnType<typeof convexTest>,
    storeId: Id<"stores">,
    orderId: Id<"orders">
  ) {
    const order = await t.run((ctx) => ctx.db.get(orderId))
    const next = paymentStatusAfterSettlement({
      status: order!.status,
      paymentStatus: order!.paymentStatus,
    })
    if (next) {
      await t.mutation(internal.orders.internalUpdatePaymentStatus, {
        id: orderId,
        paymentStatus: next,
      })
    }
    await t.mutation(internal.payments.internalSettle, settlement(storeId, orderId))
  }

  test("does not resurrect the order as paid, erasing the refund it owes", async () => {
    // THE BUG. Issue #128 leaves a cancelled paid order at "refund_pending" —
    // money owed back, the payment row still `succeeded` and refundable. The
    // settlement paths guarded with `paymentStatus !== "paid"`, and
    // "refund_pending" !== "paid", so a Stripe retry (up to three days of them)
    // or a guest refreshing the success tab wrote "paid" straight back over the
    // marker. The amber "Remboursement à effectuer" banner and the "Rembourser
    // le client" action then disappear from the admin, and nothing anywhere
    // still records that the restaurant owes the money.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-009")

    // 1. The customer pays.
    await settleThroughTheCallSitePath(t, storeId, orderId)
    expect((await t.run((ctx) => ctx.db.get(orderId)))?.paymentStatus).toBe("paid")

    // 2. The kitchen cancels: money owed back, payment left refundable.
    await t.run(async (ctx) => {
      await ctx.db.patch(orderId, {
        status: "cancelled" as const,
        paymentStatus: "refund_pending" as const,
        updatedAt: NOW + 1,
      })
    })

    // 3. Stripe retries, or the customer refreshes the success tab.
    await settleThroughTheCallSitePath(t, storeId, orderId)

    const order = await t.run((ctx) => ctx.db.get(orderId))
    expect(order?.paymentStatus).toBe("refund_pending")
    expect(order?.status).toBe("cancelled")

    // And the money is still there to give back: one row, still refundable.
    const rows = await paymentsFor(t, orderId)
    expect(rows).toHaveLength(1)
    expect(rows[0].status).toBe("succeeded")
    expect(rows[0].refundedAmount).toBeUndefined()
  })

  test("records the payment and owes it back when the order was cancelled first", async () => {
    // Cancelled while still unpaid, then the payment lands anyway — the
    // customer did pay, for something nobody will deliver. The row must exist
    // or there is nothing to refund against, and the order must say the money
    // is owed rather than claiming to be a paid cancelled order.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-010")

    await t.run((ctx) =>
      ctx.db.patch(orderId, { status: "cancelled" as const, updatedAt: NOW + 1 })
    )

    await settleThroughTheCallSitePath(t, storeId, orderId)

    const order = await t.run((ctx) => ctx.db.get(orderId))
    expect(order?.paymentStatus).toBe("refund_pending")
    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })

  test("does not write paid over a refund already made", async () => {
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-011")

    await settleThroughTheCallSitePath(t, storeId, orderId)
    await t.run((ctx) =>
      ctx.db.patch(orderId, {
        status: "cancelled" as const,
        paymentStatus: "refunded" as const,
        updatedAt: NOW + 1,
      })
    )

    await settleThroughTheCallSitePath(t, storeId, orderId)

    expect((await t.run((ctx) => ctx.db.get(orderId)))?.paymentStatus).toBe("refunded")
  })
})

// ============================================================================
// One order, collected twice — #378
// ============================================================================

describe("one order collected twice", () => {
  /**
   * The full provider path, guard included.
   *
   * `settleThroughTheCallSitePath` above replays the two steps that decide what
   * an arriving payment does to the ORDER. This one adds the step before them:
   * the binding `assertSettlesOrder` performs, which is where a settlement is
   * refused outright. All four provider paths run these three in this order —
   * `settlement-binding.test.ts` asserts that against their source, since none
   * of them loads under `edge-runtime`.
   */
  async function settleLiveCardSession(
    t: ReturnType<typeof convexTest>,
    storeId: Id<"stores">,
    orderId: Id<"orders">
  ) {
    const order = await t.run((ctx) => ctx.db.get(orderId))

    assertSettlesOrder(
      {
        provider: "stripe",
        reference: orderId,
        amountMinor: order!.total,
        currency: "EUR",
      },
      {
        orderId,
        total: order!.total,
        paymentMethod: order!.paymentMethod,
        paymentStatus: order!.paymentStatus,
      }
    )

    const next = paymentStatusAfterSettlement({
      status: order!.status,
      paymentStatus: order!.paymentStatus,
    })
    if (next) {
      await t.mutation(internal.orders.internalUpdatePaymentStatus, {
        id: orderId,
        paymentStatus: next,
      })
    }
    await t.mutation(internal.payments.internalSettle, settlement(storeId, orderId))
  }

  /** Step 2 of the reproduction: #374 re-methods the reused order to cash. */
  async function reMethodToCash(t: ReturnType<typeof convexTest>, orderId: Id<"orders">) {
    await t.run((ctx) =>
      ctx.db.patch(orderId, { paymentMethod: "cash", updatedAt: NOW + 1 })
    )
  }

  test("refuses the live card session once the counter has taken the cash", async () => {
    // THE BUG, replayed end to end.
    //
    //  1. The diner submits with card: the order is `paymentMethod: "card"`,
    //     `paymentStatus: "pending"`, and the Stripe session id is recorded.
    //     That session stays payable for ~24 h.
    //  2. They press Back and confirm « Espèces » on the same attempt. Since
    //     #374 the reused order is re-methoded to cash — correct, and the point
    //     of that fix.
    //  3. Staff take the notes: a `cash` payment row, order `paid`.
    //  4. The still-live Stripe session is completed from the tab left open.
    //  5. Identity, currency and amount all match — it IS this order at this
    //     total — and `paymentStatusAfterSettlement` answers null for an
    //     already-paid order, so the order looked untouched while a second
    //     `succeeded` row went in beside the cash one. `settlePayment`
    //     deduplicates on `externalId`, and a cash row has none.
    //
    // Verbatim probe output on the unfixed code, from the issue:
    //   PROBE order total: 1200 collected: 2400
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-1")

    await t.run((ctx) =>
      ctx.db.patch(orderId, {
        paymentMethod: "card",
        stripeCheckoutSessionId: "cs_test_378",
        updatedAt: NOW,
      })
    )
    await reMethodToCash(t, orderId)

    // The real thing, not a fixture of it: this is what the « Encaisser en
    // espèces » button runs.
    await t.run((ctx) => markCashPaid.handler(ctx, { orderId }))

    await expect(settleLiveCardSession(t, storeId, orderId)).rejects.toThrow(
      /déjà été réglée/
    )

    // One meal, collected once.
    const rows = await paymentsFor(t, orderId)
    const succeeded = rows.filter((row) => row.status === "succeeded")
    expect(succeeded).toHaveLength(1)
    expect(succeeded[0].provider).toBe("cash")
    expect(succeeded.reduce((sum, row) => sum + row.amount, 0)).toBe(CHARGE)
  })

  test("still settles a card payment that arrives before any cash", async () => {
    // The guard must not be satisfiable by refusing everything. A card order
    // paid by card settles exactly as it always did — and the cash button then
    // refuses to take the money a second time, which is `markCashPaid`'s own
    // guard doing its half.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-2")

    await t.run((ctx) =>
      ctx.db.patch(orderId, { paymentMethod: "card", updatedAt: NOW })
    )

    await settleLiveCardSession(t, storeId, orderId)

    const order = await t.run((ctx) => ctx.db.get(orderId))
    expect(order?.paymentStatus).toBe("paid")

    const rows = await paymentsFor(t, orderId)
    expect(rows).toHaveLength(1)
    expect(rows[0].provider).toBe("stripe")

    // And the counter cannot then take the notes on top of it.
    const cash = await t.run((ctx) => markCashPaid.handler(ctx, { orderId }))
    expect(cash.paymentId).toBeNull()
    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })

  test("lets a replayed Stripe delivery through without writing a second row", async () => {
    // Stripe redelivers for up to three days, and the return page settles the
    // same charge from a different event. Neither may be refused — a throw is a
    // 500 answered with more retries — and neither may write a second row.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-3")

    await t.run((ctx) =>
      ctx.db.patch(orderId, { paymentMethod: "card", updatedAt: NOW })
    )

    await settleLiveCardSession(t, storeId, orderId)
    await settleLiveCardSession(t, storeId, orderId)

    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })

  test("the ledger refuses a second collection even with the guard skipped", async () => {
    // Defence in depth, and the reason it is not redundant: five provider paths
    // remember to ask `assertSettlesOrder`, and the sixth one written next year
    // would not have to. `settlePayment` is the single seam every provider
    // settlement passes through, so the invariant is stated there too — this
    // call bypasses the guard entirely, exactly as a forgetful new path would.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-4")

    await t.run((ctx) =>
      ctx.db.patch(orderId, { paymentMethod: "cash", updatedAt: NOW })
    )
    await t.run((ctx) => markCashPaid.handler(ctx, { orderId }))

    await expect(
      t.mutation(internal.payments.internalSettle, settlement(storeId, orderId))
    ).rejects.toThrow(/double encaissement/)

    expect(await paymentsFor(t, orderId)).toHaveLength(1)
  })
})

// ============================================================================
// The session behind the abandoned checkout — #378, prevention
// ============================================================================

describe("the Stripe session an order has stopped needing", () => {
  test("is handed back for expiry once the order is no longer a card order", async () => {
    // A mutation cannot call Stripe, so `orders.create` asks this and schedules
    // `stripe.expireCheckoutSession` with the answer. Expiring the session is
    // what stops the second charge being TAKEN — the difference between the
    // diner being made whole afterwards and never being charged at all.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-5")

    await t.run((ctx) =>
      ctx.db.patch(orderId, {
        paymentMethod: "card",
        stripeCheckoutSessionId: "cs_test_abandoned",
        updatedAt: NOW,
      })
    )

    // Still a card order: the session is the one it is going to pay with.
    expect(await t.run((ctx) => abandonedCheckoutSession(ctx, orderId))).toBeNull()

    // #374 re-methods it to cash. Now the session is a way to collect the same
    // order twice.
    await t.run((ctx) => ctx.db.patch(orderId, { paymentMethod: "cash" }))
    expect(await t.run((ctx) => abandonedCheckoutSession(ctx, orderId))).toBe(
      "cs_test_abandoned"
    )

    // The id stays ON the order: it is the only pointer
    // `reconcilePendingCheckouts` has, and the one case where the expiry fails
    // is a session Stripe refuses to expire because it has already been paid —
    // exactly when that pointer is what recovers the money.
    expect(
      (await t.run((ctx) => ctx.db.get(orderId)))?.stripeCheckoutSessionId
    ).toBe("cs_test_abandoned")
  })

  test("answers null for an order that never had one", async () => {
    // Cash from the start, PayPal, and every platform order.
    const t = newHarness()
    const storeId = await seedStore(t)
    const orderId = await seedOrder(t, storeId, "A-378-6")

    await t.run((ctx) => ctx.db.patch(orderId, { paymentMethod: "cash" }))
    expect(await t.run((ctx) => abandonedCheckoutSession(ctx, orderId))).toBeNull()
  })
})
