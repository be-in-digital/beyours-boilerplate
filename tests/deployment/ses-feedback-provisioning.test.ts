/// <reference types="vite/client" />

/**
 * Is anything actually causing AWS to call `POST /webhooks/ses`?
 *
 * The route is registered in `convex/http.ts` and `handleSesWebhook` reads
 * bounces, complaints and deliveries out of it. Nothing invoked it. `setup-aws.sh`
 * created the SES configuration set with `--sending-options` and
 * `--reputation-options` and no destination of any kind, and no SNS topic
 * appeared anywhere in the repository:
 *
 *     grep -rniE "event-destination|EventDestination|sns create-topic|sns subscribe" \
 *       --include='*.sh' --include='*.ts' --include='*.mjs' --include='*.yml' .
 *     (no output)
 *
 * So `markBounced` and `markComplained` could not fire, a dead mailbox stayed
 * `active` and was re-mailed on every campaign, and AWS suspends a sending
 * account at a 5 % complaint rate — taking order confirmations down with the
 * marketing, since both leave through the same identity.
 *
 * These are source assertions, and that is the honest limit of them: nothing
 * here talks to AWS, so this proves the script ASKS for the wiring, not that a
 * given client's account has it. That is still the property that was missing —
 * the script asked for nothing — and it is the only half a test can hold.
 */

import { describe, expect, test } from "vitest"
import fs from "node:fs"
import path from "node:path"

const APPS = ["themes", "reference"] as const

function setupScript(app: (typeof APPS)[number]): string {
  return fs.readFileSync(
    path.join(__dirname, "../../..", app, "scripts/setup-aws.sh"),
    "utf8",
  )
}

describe.each(APPS)("apps/%s/scripts/setup-aws.sh", (app) => {
  const script = setupScript(app)

  test("it creates the SNS topic the notifications are published to", () => {
    expect(script).toMatch(/aws sns create-topic/)
  })

  test("it lets SES publish to that topic", () => {
    // A topic's default policy allows only its owner, so without this SES is
    // wired to a topic it cannot write to — which fails exactly as silently as
    // having no topic at all.
    expect(script).toMatch(/aws sns set-topic-attributes/)
    expect(script).toContain("ses.amazonaws.com")
    expect(script).toContain("sns:Publish")
    // Scoped to this account: another account's SES must not be able to publish
    // into a client's feedback topic.
    expect(script).toContain("AWS:SourceAccount")
  })

  test("it points the notifications at /webhooks/ses", () => {
    expect(script).toMatch(/aws sns subscribe/)
    expect(script).toContain("/webhooks/ses")
    expect(script).toContain("--protocol https")
  })

  test("it wires Bounce and Complaint, the two that decide the account", () => {
    expect(script).toMatch(/aws ses set-identity-notification-topic/)
    expect(script).toMatch(/for NOTIFICATION_TYPE in Bounce Complaint Delivery/)
  })

  /**
   * The half that would otherwise leave the endpoint receiving every bounce and
   * able to act on none of them. `handleSesWebhook` correlates through
   * `X-Store-Id` / `X-Subscriber-Id`, which live in `mail.headers`, and SES
   * omits `mail.headers` unless the identity is told to include the original
   * headers.
   */
  test("it tells SES to include the original headers", () => {
    expect(script).toMatch(/aws ses set-identity-headers-in-notifications-enabled/)
    expect(script).toContain("--enabled")
  })

  test("it says so when it cannot subscribe anything", () => {
    // The Convex deployment may not exist when this first runs. Provisioning a
    // topic nothing listens to is a working configuration with no consumer,
    // which is indistinguishable from the defect unless the script says which
    // it is.
    expect(script).toContain("CONVEX_SITE_URL is unknown")
  })

  /**
   * NOT a configuration set event destination, and the distinction is not
   * cosmetic. Event publishing sends an envelope keyed `eventType`; identity
   * notifications send one keyed `notificationType`, which is what
   * `handleSesWebhook` switches on. Wiring the wrong one delivers a body that
   * parses, matches no case and is dropped — the same silence, harder to see.
   */
  test("it uses identity notifications, the shape the handler parses", () => {
    expect(script).not.toMatch(/create-configuration-set-event-destination/)
    expect(script).not.toMatch(/put-configuration-set-event-destination/)
  })
})

describe("the handler and the script agree on the route", () => {
  test("the path the script subscribes is the path http.ts registers", () => {
    const router = fs.readFileSync(
      path.join(__dirname, "../../convex/http.ts"),
      "utf8",
    )
    expect(router).toContain('path: "/webhooks/ses"')
    expect(setupScript("themes")).toContain("/webhooks/ses")
  })
})
