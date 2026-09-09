/// <reference types="vite/client" />

/**
 * Every scheduled job this deployment registers, pinned.
 *
 * WHY THIS EXISTS. Twelve jobs are registered in `convex/crons.ts` and four had
 * a guard: the retention sweep (`packages/admin/.../privacy-surface.test.ts`),
 * the two blog crons (`__tests__/blog-storefront-wiring.test.ts`) and the Stripe
 * reconciler (`stripe-event-coverage.test.ts`). The other seven — stale
 * invitations, scheduled campaigns, the win-back, the payment-event sweep, the
 * kitchen-ticket purge, the NIGHTLY BACKUP and the Stripe key check — could be
 * deleted and nothing anywhere would notice.
 *
 * Measured rather than assumed: the `nightly backup` block was removed and every
 * test file in this app that so much as mentions a cron was run —
 * `nightly-backup`, `privacy-retention`, `stripe-event-coverage`,
 * `blog-storefront-wiring`, `scheduled-paths`, `backup-coverage`,
 * `backup-restore`. All 93 assertions stayed green. `nightly-backup.test.ts`
 * calls `runNightlyBackup` directly and never reads `crons.ts`, so a backup
 * function that no schedule ever calls tests exactly like one that runs every
 * night — which is the shape of #366, the defect the cron was added to end.
 *
 * So this pins the SET rather than adding a twelfth single-job assertion:
 * removing any registration, renaming a handler, or moving a job's hour fails
 * here. The schedule is part of the pin because the hour is a decision — the
 * backup runs at 01:30 so a copy exists before the three destructive purges at
 * 02:30, 03:15 and 04:00, and moving it after them would silently make the
 * backup unable to restore what they carried away.
 *
 * Read from the COMPILED `crons` object rather than the source text, the shape
 * `apps/site/tests/convex/saMonitoring.test.ts` uses: a registration that is
 * present in the file but never reaches `cronJobs()` — inside a dead branch,
 * say — is absent from this object, and grepping the source would not tell you.
 */

import { describe, expect, test } from "vitest"
import crons from "../../convex/crons"

/** `name` is the handler Convex will call; the key is the job's own name. */
type Registration = { name: string; schedule: Record<string, unknown> }

const REGISTERED = crons.crons as unknown as Record<string, Registration>

/**
 * The eleven, with the handler each one calls and when.
 *
 * Add a job and this fails until it is named here — which is the point: a
 * scheduled job is a promise the product makes while nobody is watching, and it
 * should not be possible to make or break one silently.
 */
const EXPECTED: Record<string, Registration> = {
  "sweep stale invitations": {
    name: "teamMembers:sweepInvitations",
    schedule: { type: "cron", cron: "0 4 * * *" },
  },
  "dispatch scheduled campaigns": {
    name: "emailCampaigns:dispatchScheduled",
    schedule: { type: "interval", minutes: 1 },
  },
  "win back lapsed customers": {
    name: "emailAutomationActions:sweepInactive",
    schedule: { type: "cron", cron: "0 9 * * *" },
  },
  "sweep expired payment events": {
    name: "paymentEvents:sweepExpired",
    schedule: { type: "cron", cron: "0 5 * * *" },
  },
  "reconcile pending stripe checkouts": {
    name: "stripe:reconcilePendingCheckouts",
    schedule: { type: "interval", minutes: 15 },
  },
  "purge expired kitchen tickets": {
    name: "kitchenTickets:purgeExpiredTickets",
    schedule: { type: "cron", cron: "30 2 * * *" },
  },
  "purge expired customer data": {
    name: "privacy:sweepExpiredCustomerData",
    schedule: { type: "cron", cron: "15 3 * * *" },
  },
  "nightly backup": {
    name: "systemBackupOffsite:runNightlyBackup",
    schedule: { type: "cron", cron: "30 1 * * *" },
  },
  "plan auto blog jobs": {
    name: "blogAutoPlanner:planAutoBlogJobs",
    schedule: { type: "cron", cron: "0 * * * *" },
  },
  "execute auto blog queue": {
    name: "blogAutoGenerate:executeAutoBlogQueue",
    schedule: { type: "interval", minutes: 10 },
  },
  "verify the Stripe key": {
    name: "stripe:verifyStripeKey",
    schedule: { type: "interval", hours: 1 },
  },
  // The twelfth. A platform order whose kitchen ticket was never created has no
  // slip on the pass, and until this job existed nothing anywhere looked for
  // one — the food was simply never cooked. Fifteen minutes because the unit of
  // harm is one service: an order taken at 19:05 that waits until 20:00 for a
  // slip has, for a dinner service, waited for ever.
  "give ticketless platform orders a slip": {
    name: "orders:sweepTicketlessPlatformOrders",
    schedule: { type: "interval", minutes: 15 },
  },
}

describe("the scheduled jobs this deployment registers", () => {
  test("exactly these, and no others", () => {
    // Both directions: a deleted job and an undocumented new one are the same
    // failure — a schedule nobody decided.
    expect(Object.keys(REGISTERED).sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  test.each(Object.keys(EXPECTED))("%s calls the handler it says, when it says", (job) => {
    const actual = REGISTERED[job]
    expect(actual, `"${job}" is not registered in convex/crons.ts`).toBeDefined()
    expect(actual!.name).toBe(EXPECTED[job]!.name)
    expect(actual!.schedule).toEqual(EXPECTED[job]!.schedule)
  })

  test("the nightly backup is scheduled before the jobs that delete things", () => {
    /* Not decoration: the backup exists so a copy survives the three
       destructive nightly jobs. Moving it after them would leave a backup that
       cannot restore what they carried away, and every other assertion here
       would still pass. */
    const minuteOfDay = (job: string) => {
      const cron = (REGISTERED[job]!.schedule as { cron: string }).cron.split(" ")
      return Number(cron[1]) * 60 + Number(cron[0])
    }

    for (const destructive of [
      "purge expired kitchen tickets",
      "purge expired customer data",
      "sweep stale invitations",
    ]) {
      expect(
        minuteOfDay("nightly backup"),
        `the backup must run before "${destructive}"`,
      ).toBeLessThan(minuteOfDay(destructive))
    }
  })

  test("every job runs through internal.*, because a cron has no identity", () => {
    // `crons.ts` states the rule in its own header and `scheduled-paths` asserts
    // it against the source. Asserted here too, against the compiled object: a
    // public function reached from a schedule is either refused or should not
    // have been public.
    for (const [job, registration] of Object.entries(REGISTERED)) {
      expect(registration.name, `"${job}" names no handler`).toMatch(/^[A-Za-z]\w*:\w+$/)
    }
  })
})
