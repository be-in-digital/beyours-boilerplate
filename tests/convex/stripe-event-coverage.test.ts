/**
 * The Stripe webhook must not silently stop listening to an event that moves
 * money.
 *
 * THE BUG: `stripeWebhookVerify` extracted a payload for exactly ONE event
 * type, `checkout.session.completed`. Every other type fell through to a bare
 * `{ eventType, eventId }`, and `stripeWebhook` acted on that one type only.
 * `payment_intent.succeeded`, `payment_intent.payment_failed`,
 * `charge.refunded` and `charge.dispute.created` were verified, answered 200,
 * and discarded.
 *
 * Two of those are money:
 *
 *  - A guest who pays and closes the tab before the confirmation page sends no
 *    return-page settlement. If the checkout delivery is lost too, the charge
 *    sits in Stripe behind an order at `paymentStatus: "pending"` and the
 *    kitchen never sees it.
 *  - A refund issued from the Stripe dashboard — how an owner in a hurry does
 *    it — moved real money and left our balance untouched, so the admin went on
 *    offering the whole amount as refundable.
 *
 * This is a source-level check, and it has to be. The verifier is `"use node"`
 * and dynamically imports the Stripe SDK, so it does not load under the
 * `edge-runtime` environment these suites run in; the handler is an
 * `httpAction` that calls it. What the mutations underneath do is proved
 * behaviourally in `provider-events.test.ts`. What is proved here is that the
 * route still reaches them.
 *
 * Comments are stripped before matching. Every one of these type names appears
 * in the prose above the code that handles it, so a detector without that step
 * would pass against the exact file it is meant to catch.
 */

import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const CONVEX_DIR = join(__dirname, "../../convex")

/** Source with comments removed, so a claim about an event cannot pass for it. */
function code(module: string): string {
  return readFileSync(join(CONVEX_DIR, `${module}.ts`), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
}

/** The body of one named export, up to the next top-level export. */
function exportBody(module: string, name: string): string {
  const source = code(module)
  const start = source.indexOf(`export const ${name} =`)
  if (start === -1) return ""
  const next = source.indexOf("\nexport const ", start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

/**
 * The five Stripe deliveries this backend has to understand, and why.
 *
 * `payment_intent.payment_failed` writes nothing — the order already says the
 * charge did not happen — but it is on the list because falling back into the
 * default branch is how the other four were lost, and a failure that stops
 * being logged is a card problem indistinguishable from a configuration one.
 */
const HANDLED_EVENTS = [
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
]

/** An event Stripe sends that we deliberately do not act on. */
const IGNORED_EVENT = "customer.subscription.updated"

describe("the Stripe webhook's event coverage", () => {
  test("the modules under test are not empty", () => {
    // Guards the guard: a path typo would make every assertion below vacuous.
    expect(code("stripeWebhookVerify").length).toBeGreaterThan(500)
    expect(exportBody("stripeWebhook", "handleWebhook").length).toBeGreaterThan(500)
  })

  test.each(HANDLED_EVENTS)("the verifier normalises %s", (type) => {
    // Dropping a case here sends the type back to the bare
    // `{ eventId, eventType }` return, which the handler cannot act on.
    expect(code("stripeWebhookVerify")).toContain(`"${type}"`)
  })

  test.each(HANDLED_EVENTS)("the handler routes %s", (type) => {
    expect(exportBody("stripeWebhook", "handleWebhook")).toContain(`"${type}"`)
  })

  test("the detector can also say no", () => {
    // The other half of guarding the guard: a detector that answers true for
    // everything is not a detector.
    expect(code("stripeWebhookVerify")).not.toContain(`"${IGNORED_EVENT}"`)
    expect(exportBody("stripeWebhook", "handleWebhook")).not.toContain(`"${IGNORED_EVENT}"`)
  })

  test("prose naming an event does not pass for handling it", () => {
    // The shape this check exists to resist: the file documents every type it
    // dropped, in the comment directly above the code that now handles it.
    const claimOnly = [
      "// charge.refunded and charge.dispute.created were discarded here",
      "export const verify = internalAction({ handler: async () => {} });",
    ].join("\n")

    const stripped = claimOnly
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")

    expect(stripped).not.toContain("charge.refunded")
  })

  test("the non-checkout events resolve through the stored payment reference", () => {
    // Only `checkout.session.completed` carries our `metadata.orderId`, because
    // `createCheckoutSession` writes it into the SESSION. A payment intent and a
    // charge are different objects and carry none of it, so reading an order id
    // off one is a lookup that always returns nothing.
    const body = exportBody("stripeWebhook", "handleWebhook")
    expect(body).toContain("internalSettleFromCharge")
    expect(body).toContain("internalRecordProviderRefund")
    expect(body).toContain("externalId: paymentIntent")
  })

  test("a handler that threw answers 500, not 200", () => {
    // The route returned 200 unconditionally, so a transient failure was
    // recorded as a delivery handled and Stripe never retried it. The 500 has
    // to come from a catch around the routing, and it has to be reached before
    // the delivery is marked processed.
    const body = exportBody("stripeWebhook", "handleWebhook")
    const catchBlock = body.slice(body.indexOf("} catch (err)"))
    expect(catchBlock).toMatch(/status:\s*500/)
    expect(catchBlock.indexOf("markProcessed")).toBeGreaterThan(-1)
    expect(body.indexOf("} catch (err)")).toBeLessThan(body.indexOf("markProcessed"))
  })

  test("an event we ignore still answers 200", () => {
    // Ignoring an event is a decision. Answering anything but 2xx to it buys
    // three days of Stripe retries for something we will never act on, so the
    // default branch must not return a response of its own at all — it falls
    // through to the 200 at the end.
    const body = exportBody("stripeWebhook", "handleWebhook")
    expect(body).toContain("default:")
    const defaultCase = body.slice(
      body.indexOf("default:"),
      body.indexOf("} catch (err)")
    )
    expect(defaultCase.length).toBeGreaterThan(0)
    expect(defaultCase).not.toContain("new Response")
  })
})

describe("the reconciliation sweep", () => {
  const RECONCILER = "reconcilePendingCheckouts"

  test("exists as an internal action", () => {
    // A charge Stripe never told us about is only recoverable by ASKING. Every
    // other settlement path is a message we have to receive.
    expect(code("stripe")).toContain(`export const ${RECONCILER} = internalAction(`)
  })

  test("asks Stripe rather than trusting our own record", () => {
    const body = exportBody("stripe", RECONCILER)
    expect(body).toContain("internalListStrandedCheckouts")
    expect(body).toContain("checkout.sessions.retrieve")
  })

  test("settles through the shared settlement path", () => {
    // Not a private write. It inherits the amount binding, the cancelled-order
    // decision and the one-charge-one-row deduplication from the same three
    // functions every other settlement uses.
    const body = exportBody("stripe", RECONCILER)
    expect(body).toContain("assertSettlesOrder")
    expect(body).toContain("paymentStatusAfterSettlement")
    expect(body).toContain("internalSettle")
  })

  test("one bad order does not abandon the rest of the sweep", () => {
    // `assertSettlesOrder` throws on a mismatch, and that order is precisely
    // the one a human needs to look at — not a reason to leave the others
    // stranded for another fifteen minutes.
    const body = exportBody("stripe", RECONCILER)
    const loop = body.slice(body.indexOf("for (const candidate"))
    expect(loop).toContain("try {")
    expect(loop).toContain("catch")
  })

  test("is scheduled, through an internal path", () => {
    // A cron runs with no identity, so `api.*` here would be either refused or
    // public and should not be. `scheduled-paths` asserts the general rule;
    // this asserts the job exists at all.
    const crons = code("crons")
    expect(crons).toContain(`internal.stripe.${RECONCILER}`)
    expect(crons).not.toMatch(/api\.stripe\./)
  })

  test("the checkout session id is persisted, or there is nothing to ask about", () => {
    // The session id was handed to the browser and stored nowhere, so a
    // stranded order could not even be named to Stripe.
    expect(exportBody("stripe", "createCheckoutSession")).toContain(
      "internalAttachCheckoutSession"
    )
  })
})
