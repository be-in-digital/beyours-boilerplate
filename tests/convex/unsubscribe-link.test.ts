// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * The unsubscribe link, driven through the real HTTP router.
 *
 * `GET /email/unsubscribe` used to unsubscribe. A GET that mutates is fetched
 * by things that are not the recipient — Outlook Safe Links, corporate mail
 * scanners and the Gmail image proxy all follow links in delivered mail to
 * check them — so paying customers were removed from the list without ever
 * clicking, silently, with nothing to explain it afterwards.
 *
 * These run through `t.fetch`, which exercises `http.ts` and the `httpAction`
 * handlers rather than the mutation underneath, because "the route does not
 * mutate on GET" is a claim about the route.
 */

import { convexTest } from "convex-test"
import { afterEach, describe, expect, test } from "vitest"
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
 * Mutations here queue work through `ctx.scheduler.runAfter`. A test finishes
 * in milliseconds and leaves it pending; whatever fires it next writes against
 * a transaction that closed, and because nothing awaits it that arrives as an
 * unhandled rejection — every assertion green and the run still exiting 1,
 * blaming whichever file happened to be running.
 *
 * Cancel rather than run: several of these hand off to actions, and an action
 * has no transaction for convex-test to record its completion in.
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


async function seedSubscriber(t: ReturnType<typeof convexTest>, email: string) {
  const storeId = await t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Chez Luigi",
      slug: `luigi-${email}`,
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

  const id = await t.run((ctx) =>
    ctx.db.insert("emailSubscribers", {
      storeId,
      email,
      status: "active" as const,
      source: "storefront_form" as const,
      tags: ["newsletter"],
      consentAt: NOW,
      consentSource: "test",
      bounceCount: 0,
      metadata: {
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        favoriteProducts: [],
        orderTypes: [],
      },
      createdAt: NOW,
      updatedAt: NOW,
    })
  )

  return { storeId, id }
}

function statusOf(t: ReturnType<typeof convexTest>, id: Id<"emailSubscribers">) {
  return t.run(async (ctx) => (await ctx.db.get(id))?.status)
}

describe("GET /email/unsubscribe", () => {
  test("a link scanner opening the URL does not unsubscribe anyone", async () => {
    const t = newHarness()
    const { id } = await seedSubscriber(t, "yanis@resto.example")

    const response = await t.fetch(`/email/unsubscribe?id=${id}`, { method: "GET" })

    expect(response.status).toBe(200)
    // The whole point. Outlook Safe Links and the Gmail image proxy issue
    // exactly this request, for every recipient, on delivery.
    expect(await statusOf(t, id)).toBe("active")
  })

  test("it offers a button instead of acting", async () => {
    const t = newHarness()
    const { id } = await seedSubscriber(t, "yanis@resto.example")

    const body = await (await t.fetch(`/email/unsubscribe?id=${id}`)).text()

    expect(body).toContain('method="POST"')
    expect(body).toContain(id)
  })

  test("it escapes the id it echoes back into the form", async () => {
    const t = newHarness()
    const body = await (
      await t.fetch(`/email/unsubscribe?id=${encodeURIComponent('"><script>x</script>')}`)
    ).text()

    // The id comes from the query string, so it is attacker-controlled text on
    // its way into HTML.
    expect(body).not.toContain("<script>x</script>")
    expect(body).toContain("&lt;script&gt;")
  })

  test("a link with no id is refused", async () => {
    const t = newHarness()
    expect((await t.fetch("/email/unsubscribe")).status).toBe(400)
  })
})

describe("POST /email/unsubscribe", () => {
  test("the confirmation button unsubscribes", async () => {
    const t = newHarness()
    const { id } = await seedSubscriber(t, "yanis@resto.example")

    const response = await t.fetch("/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id }).toString(),
    })

    expect(response.status).toBe(200)
    expect(await statusOf(t, id)).toBe("unsubscribed")
  })

  test("RFC 8058 one-click unsubscribes", async () => {
    const t = newHarness()
    const { id } = await seedSubscriber(t, "yanis@resto.example")

    // What Gmail and Yahoo send: the id stays in the URL from the
    // `List-Unsubscribe` header, and the body is the fixed marker. No session,
    // no CSRF token, no further interaction — that is the specification.
    const response = await t.fetch(`/email/unsubscribe?id=${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    })

    expect(response.status).toBe(200)
    expect(await statusOf(t, id)).toBe("unsubscribed")
  })

  test("a POST with no id anywhere is refused", async () => {
    const t = newHarness()
    expect((await t.fetch("/email/unsubscribe", { method: "POST" })).status).toBe(400)
  })

  test("an id that no longer exists still reports success", async () => {
    const t = newHarness()
    const { id } = await seedSubscriber(t, "yanis@resto.example")
    await t.run((ctx) => ctx.db.delete(id))

    // Deliberate: the recipient asked not to be on the list and they are not.
    // Distinguishing the cases would turn the page into an oracle for which
    // ids are live. The failure is logged rather than shown.
    const response = await t.fetch("/email/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id }).toString(),
    })
    expect(response.status).toBe(200)
  })
})
