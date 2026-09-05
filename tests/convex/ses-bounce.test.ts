// @vitest-environment edge-runtime
/// <reference types="vite/client" />

/**
 * What a bounce costs, and who decides.
 *
 * `markBounced` suppressed an address only on its third bounce. For a mailbox
 * SES reports as `Permanent` — the domain resolves, the user does not, and no
 * amount of retrying changes that — the other two sends are pure ratio. AWS
 * suspends a sending identity on a 5% bounce rate, and a list built over two
 * years carries enough dead addresses to reach that on its own once each one
 * counts three times. The suspension takes order confirmations down with the
 * marketing, because they leave through the same identity.
 *
 * The classification was already arriving. `SESNotification` declared
 * `bounce.bounceType` and the `Bounce` arm never read it, so `markBounced` was
 * called with the subscriber id alone — and its validator had no argument to
 * receive the type with even if the arm had passed one.
 *
 * These drive the real `POST /webhooks/ses` with a genuinely signed SNS
 * envelope rather than calling the mutation directly, because "the webhook
 * forwards the bounce type" is a claim about the route. The mutation's own
 * arithmetic is covered in `packages/convex-functions`.
 */

import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { Id } from "../../convex/_generated/dataModel"
import schema from "../../convex/schema"

const modules = import.meta.glob("../../convex/**/*.ts")

const NOW = 1_700_000_000_000
const CERT_URL =
  "https://sns.eu-west-3.amazonaws.com/SimpleNotificationService-test.pem"

const harnesses: ReturnType<typeof convexTest>[] = []

function newHarness() {
  const t = convexTest(schema, modules)
  harnesses.push(t)
  return t
}

/**
 * Cancel whatever the test left on the scheduler — see `unsubscribe-link.test.ts`
 * for why a pending job outliving its transaction fails the run from outside
 * any assertion.
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
  vi.unstubAllGlobals()
})

/**
 * One RSA keypair for the file: SNS signs with a private key and publishes the
 * certificate, so a test that wants to pass the real verifier has to do both.
 * Generating 2048 bits per test is the slowest thing here by an order of
 * magnitude, and nothing under test depends on the key changing.
 */
let signMessage: (stringToSign: string) => string
let certPem: string

beforeEach(async () => {
  if (signMessage) return
  const { generateKeyPairSync, createSign } = await import("node:crypto")
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  })
  certPem = publicKey.export({ type: "spki", format: "pem" }) as string
  signMessage = (stringToSign: string) => {
    const signer = createSign("RSA-SHA1")
    signer.update(stringToSign, "utf8")
    return signer.sign(privateKey, "base64")
  }
})

async function seedSubscriber(
  t: ReturnType<typeof convexTest>,
  status: "active" | "complained" = "active"
) {
  const storeId = await t.run((ctx) =>
    ctx.db.insert("stores", {
      name: "Chez Luigi",
      slug: `luigi-${status}-${Math.random()}`,
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
      email: "yanis@resto.example",
      status,
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

/**
 * A signed SNS envelope carrying one SES bounce notification.
 *
 * The signed bytes are `field\nvalue\n` for the fields SNS signs, in the order
 * it signs them — the same construction `buildSnsStringToSign` performs. Get it
 * wrong and the verifier rejects, which is the safe direction but would make
 * every test here pass for the wrong reason, so the assertions below check the
 * response status too.
 */
function signedBounce(args: {
  storeId: Id<"stores">
  subscriberId: Id<"emailSubscribers">
  bounceType: "Permanent" | "Transient" | "Undetermined"
  messageId?: string
}) {
  const notification = {
    notificationType: "Bounce",
    mail: {
      messageId: args.messageId ?? "ses-1",
      source: "no-reply@beyours.fr",
      destination: ["yanis@resto.example"],
      headers: [
        { name: "X-Store-Id", value: args.storeId },
        { name: "X-Subscriber-Id", value: args.subscriberId },
      ],
    },
    bounce: {
      bounceType: args.bounceType,
      bouncedRecipients: [{ emailAddress: "yanis@resto.example" }],
    },
  }

  return signedNotification(notification, args.messageId ?? "sns-1")
}

/** Wrap and sign any SES notification body, whatever its shape. */
function signedNotification(notification: unknown, messageId: string) {
  const envelope: Record<string, string> = {
    Type: "Notification",
    MessageId: messageId,
    TopicArn: "arn:aws:sns:eu-west-3:000000000000:ses-events",
    Message: JSON.stringify(notification),
    Timestamp: new Date(NOW).toISOString(),
    SignatureVersion: "1",
    SigningCertURL: CERT_URL,
  }

  const signedFields = [
    "Message",
    "MessageId",
    "Subject",
    "Timestamp",
    "TopicArn",
    "Type",
  ]
  let stringToSign = ""
  for (const field of signedFields) {
    if (envelope[field] === undefined) continue
    stringToSign += `${field}\n${envelope[field]}\n`
  }
  envelope.Signature = signMessage(stringToSign)

  return JSON.stringify(envelope)
}

/** The verifier fetches the certificate; hand it the matching public key. */
function stubCertificateFetch() {
  vi.stubGlobal("fetch", async (input: unknown) => {
    if (String(input) === CERT_URL) return new Response(certPem, { status: 200 })
    throw new Error(`unexpected fetch: ${String(input)}`)
  })
}

async function deliverBounce(
  t: ReturnType<typeof convexTest>,
  body: string
): Promise<number> {
  const response = await t.fetch("/webhooks/ses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  return response.status
}

function readSubscriber(
  t: ReturnType<typeof convexTest>,
  id: Id<"emailSubscribers">
) {
  return t.run(async (ctx) => await ctx.db.get(id))
}

describe("POST /webhooks/ses — Bounce", () => {
  test("a permanent bounce suppresses the address on the first event", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    expect(
      await deliverBounce(t, signedBounce({ storeId, subscriberId: id, bounceType: "Permanent" }))
    ).toBe(200)

    const after = await readSubscriber(t, id)
    // Not on the third. `pageForSending` selects on `status === "active"`, so
    // anything short of this flip is two more sends to a mailbox that does not
    // exist.
    expect(after?.status).toBe("bounced")
    expect(after?.bounceCount).toBe(1)
  })

  test("a transient bounce keeps the three-strike counter", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    // A full mailbox or a greylisting recovers. Suppressing on the first one
    // would quietly delete real customers from the list.
    for (const attempt of [1, 2]) {
      expect(
        await deliverBounce(
          t,
          signedBounce({
            storeId,
            subscriberId: id,
            bounceType: "Transient",
            messageId: `t-${attempt}`,
          })
        )
      ).toBe(200)
      const between = await readSubscriber(t, id)
      expect(between?.status).toBe("active")
      expect(between?.bounceCount).toBe(attempt)
    }

    await deliverBounce(
      t,
      signedBounce({ storeId, subscriberId: id, bounceType: "Transient", messageId: "t-3" })
    )

    const after = await readSubscriber(t, id)
    expect(after?.status).toBe("bounced")
    expect(after?.bounceCount).toBe(3)
  })

  test("an undetermined bounce is treated as transient", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    await deliverBounce(
      t,
      signedBounce({ storeId, subscriberId: id, bounceType: "Undetermined" })
    )

    // SES could not classify it. An address we cannot prove dead keeps its
    // place on the list.
    const after = await readSubscriber(t, id)
    expect(after?.status).toBe("active")
    expect(after?.bounceCount).toBe(1)
  })

  test("a bounce does not overwrite a spam complaint", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t, "complained")
    stubCertificateFetch()

    await deliverBounce(
      t,
      signedBounce({ storeId, subscriberId: id, bounceType: "Permanent" })
    )

    // Both statuses suppress, but only one of them is the answer to "why did
    // you stop mailing this person" that a regulator asks for.
    const after = await readSubscriber(t, id)
    expect(after?.status).toBe("complained")
    expect(after?.bounceCount).toBe(1)
  })

  test("a classification SES has not used before still counts", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    const body = JSON.parse(
      signedBounce({ storeId, subscriberId: id, bounceType: "Permanent" })
    )
    // Rewrite the classification inside the signed payload, then re-sign, so
    // this is a well-formed message carrying a value the validator's closed
    // union does not know.
    const notification = JSON.parse(body.Message)
    notification.bounce.bounceType = "SomethingAwsAddedLater"
    const resigned = signedBounce({
      storeId,
      subscriberId: id,
      bounceType: notification.bounce.bounceType as "Permanent",
      messageId: "unknown-1",
    })

    expect(await deliverBounce(t, resigned)).toBe(200)

    // The whole dispatch runs inside a catch that only logs, so a validator
    // error here would silently drop the bounce — worse than the behaviour
    // this replaced. It must count instead, and not suppress.
    const after = await readSubscriber(t, id)
    expect(after?.bounceCount).toBe(1)
    expect(after?.status).toBe("active")
  })

  test("a Bounce carrying no bounce object at all still counts", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    const envelope = JSON.parse(
      signedBounce({ storeId, subscriberId: id, bounceType: "Permanent" })
    )
    const notification = JSON.parse(envelope.Message)
    delete notification.bounce
    const rebuilt = signedNotification(notification, "no-bounce-1")

    expect(await deliverBounce(t, rebuilt)).toBe(200)
    const after = await readSubscriber(t, id)
    expect(after?.bounceCount).toBe(1)
    expect(after?.status).toBe("active")
  })

  test("an unsigned bounce changes nothing", async () => {
    const t = newHarness()
    const { storeId, id } = await seedSubscriber(t)
    stubCertificateFetch()

    const forged = JSON.parse(
      signedBounce({ storeId, subscriberId: id, bounceType: "Permanent" })
    )
    forged.Signature = Buffer.from("not-a-signature").toString("base64")

    // Suppression is now a one-event decision, which makes forging one cheaper
    // than it was: a single unauthenticated POST would silence a competitor's
    // best customer.
    expect(await deliverBounce(t, JSON.stringify(forged))).toBe(403)
    const after = await readSubscriber(t, id)
    expect(after?.status).toBe("active")
    expect(after?.bounceCount).toBe(0)
  })
})
