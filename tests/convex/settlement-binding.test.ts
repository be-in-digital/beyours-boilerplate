/**
 * Every entry point that marks an order paid must first prove the payment
 * settles THAT order.
 *
 * This is a source-level check, not a behavioural one, and it is the only kind
 * that can catch the defect it exists for.
 *
 * THE BUG: `stripe.ts` carried the annotation "assertSettlesOrder binds the
 * session to this order, currency and amount". The module had zero imports of
 * `assertSettlesOrder` and zero calls to it. The comment was the only thing
 * that made the guard look present — a reviewer reading the file, and the
 * audit that produced the annotation, both took it at its word.
 *
 * A behavioural test cannot reach this. `stripe.ts`, `sumup.ts` and `paypal.ts`
 * are all `"use node"` and dynamically import provider SDKs, so none of them
 * loads under the `edge-runtime` environment these suites run in. The guard's
 * own logic is unit-tested in
 * `packages/convex-functions/src/__tests__/paymentSettlement.test.ts`; what is
 * asserted here is that the four call sites actually reach it.
 *
 * Comments are stripped before matching. The first version of this detector was
 * written without that step and passed against `stripe.ts` — because the lying
 * comment contains the word it was looking for.
 */

import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const CONVEX_DIR = join(__dirname, "../../convex")

const GUARD = "assertSettlesOrder"
/** The shared decision about what a settlement writes to `order.paymentStatus`. */
const ORDER_GUARD = "paymentStatusAfterSettlement"

/** Source with comments removed, so a claim about the guard cannot pass for it. */
function code(module: string): string {
  return readFileSync(join(CONVEX_DIR, `${module}.ts`), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
}

/** Whether the module imports a named export from the settlement package. */
function importsFromSettlement(module: string, name: string): boolean {
  return new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["'][^"']*paymentSettlement["']`
  ).test(code(module))
}

/** Whether the module imports the settlement guard. */
function importsGuard(module: string): boolean {
  return importsFromSettlement(module, GUARD)
}

/** The body of one named export, up to the next top-level export. */
function exportBody(module: string, name: string): string {
  const source = code(module)
  const start = source.indexOf(`export const ${name} =`)
  if (start === -1) return ""
  const next = source.indexOf("\nexport const ", start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

/** Whether that export's own body calls the guard. */
function callsGuard(module: string, name: string): boolean {
  return new RegExp(`\\b${GUARD}\\s*\\(`).test(exportBody(module, name))
}

/** Whether that export asks the shared decision what to write to the order. */
function consultsOrderGuard(module: string, name: string): boolean {
  return new RegExp(`\\b${ORDER_GUARD}\\s*\\(`).test(exportBody(module, name))
}

/**
 * The four places a provider payment turns an order into a paid one.
 *
 * SumUp and PayPal take the provider's payment id and our order id as two
 * INDEPENDENT arguments, so the reference check is what stops a cheap paid
 * checkout being paired with an expensive pending order.
 *
 * Stripe derives the order from the same session's metadata, so its reference
 * check is tautological and closes no cross-order replay. What it does close is
 * the amount and currency binding — the reason it belongs on this list.
 *
 * `reconcilePendingCheckouts` is the fifth, and the only one nobody triggers:
 * it runs on the scheduler and ASKS Stripe about the checkouts that never came
 * back paid. Every other entry point is a message we have to receive, which is
 * why a guest who pays and closes the tab could leave a real charge behind an
 * order stuck at `pending`. Being a rescue path earns it no exemption — a sweep
 * that marked orders paid without the amount binding would be the widest hole
 * of the five, because it runs unattended.
 */
const SETTLEMENT_ENTRY_POINTS: Array<{ module: string; fn: string }> = [
  { module: "stripe", fn: "verifyCheckoutSession" },
  { module: "stripe", fn: "reconcilePendingCheckouts" },
  { module: "stripeWebhook", fn: "handleWebhook" },
  { module: "sumup", fn: "verifyCheckout" },
  { module: "paypal", fn: "capturePayPalOrder" },
]

describe("settlement binding", () => {
  test("every settlement entry point exists", () => {
    // Guards the guard: a renamed export would make every assertion below
    // vacuously true, because an empty body matches no pattern.
    for (const { module, fn } of SETTLEMENT_ENTRY_POINTS) {
      expect(exportBody(module, fn), `${module}.${fn}`).not.toBe("")
    }
  })

  test.each(SETTLEMENT_ENTRY_POINTS)(
    "$module imports the settlement guard",
    ({ module }) => {
      expect(importsGuard(module), `${module}.ts must import ${GUARD}`).toBe(true)
    }
  )

  test.each(SETTLEMENT_ENTRY_POINTS)(
    "$module.$fn calls the settlement guard",
    ({ module, fn }) => {
      expect(callsGuard(module, fn), `${module}.${fn} must call ${GUARD}`).toBe(true)
    }
  )

  test("the detector recognises the two call sites that always had the guard", () => {
    // Guards the guard: SumUp and PayPal have called `assertSettlesOrder` since
    // it was written. If either regex silently matched nothing, the assertions
    // above would pass while proving nothing at all.
    expect(importsGuard("sumup")).toBe(true)
    expect(callsGuard("sumup", "verifyCheckout")).toBe(true)
    expect(importsGuard("paypal")).toBe(true)
    expect(callsGuard("paypal", "capturePayPalOrder")).toBe(true)
  })

  test("the detector can also say no", () => {
    // The other half of guarding the guard: a detector that answers true for
    // everything is not a detector. `orders.ts` settles nothing and must not
    // read as guarded, and `createCheckoutSession` opens a session rather than
    // closing one — it has no payment to verify yet.
    expect(importsGuard("orders")).toBe(false)
    expect(callsGuard("stripe", "createCheckoutSession")).toBe(false)
  })

  test("the guard is not defeated by a comment that merely names it", () => {
    // The exact shape of the original defect: an annotation claiming the
    // binding, in a module that never called it. Comment text must not satisfy
    // either detector.
    const claimOnly = [
      "// @public-by-design: assertSettlesOrder binds the session to this order",
      "export const verifySomething = action({ handler: async () => {} });",
    ].join("\n")

    const stripped = claimOnly
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")

    expect(stripped).not.toMatch(new RegExp(`\\b${GUARD}\\b`))
  })

  test.each(SETTLEMENT_ENTRY_POINTS)(
    "$module.$fn asks what the settlement should write to the order",
    ({ module, fn }) => {
      expect(importsFromSettlement(module, ORDER_GUARD)).toBe(true)
      expect(consultsOrderGuard(module, fn)).toBe(true)
    }
  )

  test.each(SETTLEMENT_ENTRY_POINTS)(
    "$module.$fn never writes paymentStatus: \"paid\" as a literal",
    ({ module, fn }) => {
      // THE BUG this catches: all four guarded with
      // `if (order.paymentStatus !== "paid")` and then wrote `"paid"`. Issue
      // #128 introduced `refund_pending` — paid, then cancelled, money owed
      // back — and `"refund_pending" !== "paid"` is TRUE, so a Stripe retry or
      // a refreshed success tab walked in and erased the marker. Nothing then
      // recorded that the restaurant owed the money.
      //
      // A literal here means someone decided the answer locally instead of
      // asking `paymentStatusAfterSettlement`, which is how the four paths
      // drifted apart from `markCashPaid` in the first place.
      expect(exportBody(module, fn)).not.toMatch(/paymentStatus:\s*"paid"/)
    }
  )

  test("the literal detector is not vacuous", () => {
    // Guards the guard: it has to be able to FIND the pattern it forbids.
    expect('paymentStatus: "paid",').toMatch(/paymentStatus:\s*"paid"/)
    // And the entry-point bodies it runs against are not empty strings.
    for (const { module, fn } of SETTLEMENT_ENTRY_POINTS) {
      expect(exportBody(module, fn).length, `${module}.${fn}`).toBeGreaterThan(200)
    }
  })
})

/**
 * WHERE the settlement sits relative to the order write.
 *
 * Returns the character offsets of the first call that RECORDS THE MONEY and
 * the first that MARKS THE ORDER PAID, so a test can assert which comes first.
 */
function settlementOffsets(module: string, name: string): { settles: number; marksPaid: number } {
  const body = exportBody(module, name)
  return {
    settles: body.search(/\binternalSettle\b|\bsettleOrRecordRefusal\s*\(/),
    marksPaid: body.search(/\binternalUpdatePaymentStatus\b/),
  }
}

describe("the ledger is written before the order says « Payé »", () => {
  /**
   * WHY ORDER MATTERS HERE, and why asserting it needs its own test.
   *
   * `stripeWebhook.ts` has carried the rule and the reason since #411 — "THE
   * LEDGER FIRST, THEN THE ORDER" — and it was the ONLY one of the six
   * settlement paths that obeyed it. The other five wrote `paymentStatus:
   * "paid"` first and recorded the money second, and #438 added a sixth in that
   * shape. A comment-stripped offset scan of all six:
   *
   *   stripe.ts :: verifyCheckoutSession        marks paid 446, settles 461
   *   stripe.ts :: reconcilePendingCheckouts               622          628
   *   sumup.ts :: verifyCheckout                          246          258
   *   paypal.ts :: capturePayPalOrder                     299          311
   *   stripeWebhook.ts :: handleWebhook                   164          136   <- the only OK
   *   payments.ts :: settleFromChargeEvent                685          691
   *
   * These are separate transactions. The order write COMMITS, and the
   * settlement can still refuse afterwards — an amount that no longer binds, an
   * order already collected by another charge (#378, #411). What is left is an
   * order reading « Payé » with no payment row behind it. Probed on the bench:
   * 2 400 c taken, 1 200 c on the ledger, `FA-2026-000001` minted against it,
   * the diner's confirmation planned, and zero `payment_collection_refused`
   * rows to tell anybody.
   *
   * The suite was 25/25 green through all of it. It asserted the import, the
   * call site, the guard consultation and the absence of a `"paid"` literal —
   * everything about the settlement except WHEN it happens. That is the gap
   * this closes.
   */
  // A plain loop rather than `test.each`: the `$module.$fn` interpolation the
  // suite above uses renders as "undefined" here, so five identical names go up
  // and the one that failed cannot be told from the four that did not.
  for (const { module, fn } of SETTLEMENT_ENTRY_POINTS) {
    test(`${module}.${fn} records the payment before it marks the order paid`, () => {
      const { settles, marksPaid } = settlementOffsets(module, fn)
      // A path that does not do both is not this test's business; the test
      // below is what holds every entry point to doing them at all.
      if (settles === -1 || marksPaid === -1) return
      expect(
        settles,
        `${module}.${fn}: the order is marked paid at ${marksPaid} and the money ` +
          `recorded at ${settles} — a refusal in between leaves an order reading ` +
          `« Payé » with nothing on the ledger behind it`
      ).toBeLessThan(marksPaid)
    })
  }

  test("every entry point does both, so the skip above is never the whole test", () => {
    // The guard above returns early when a path lacks one of the two calls,
    // which would make it vacuous for a path that quietly stopped settling.
    for (const { module, fn } of SETTLEMENT_ENTRY_POINTS) {
      const { settles, marksPaid } = settlementOffsets(module, fn)
      expect(settles, `${module}.${fn} records no payment`).toBeGreaterThan(-1)
      expect(marksPaid, `${module}.${fn} marks no order paid`).toBeGreaterThan(-1)
    }
  })

  test("a refused settlement on a return page is written down", () => {
    // The three return pages are the paths that fire FIRST — a diner's browser
    // arrives seconds after paying, well before the webhook — and they recorded
    // NOTHING when a settlement was refused. The webhook and the reconciliation
    // sweep both do (#411, #438). `settleOrRecordRefusal` is what makes the
    // return pages match; asserting the call site is what stops the next edit
    // reaching for the bare mutation again.
    for (const { module, fn } of [
      { module: "stripe", fn: "verifyCheckoutSession" },
      { module: "sumup", fn: "verifyCheckout" },
      { module: "paypal", fn: "capturePayPalOrder" },
    ]) {
      expect(exportBody(module, fn), `${module}.${fn}`).toMatch(
        /settleOrRecordRefusal\s*\(/
      )
    }
  })
})
