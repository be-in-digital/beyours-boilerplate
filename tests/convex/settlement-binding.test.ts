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
