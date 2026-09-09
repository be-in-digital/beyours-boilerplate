import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

/**
 * Scheduled work for a restaurant deployment.
 *
 * A scheduled job runs with NO user identity, so everything referenced here
 * must be `internal.*`. Reaching for `api.*` calls a function that will either
 * refuse the sweep — if it is guarded — or is public and should not be; the
 * nightly menu push already died that way once. `tests/convex/scheduled-paths`
 * asserts the rule against the source.
 */
const crons = cronJobs();

// Expire invitations past their seven days, clear their tokens, and delete the
// ones nobody ever accepted after thirty more. 4am UTC: outside service, and
// away from the 3am hour the commercial site already uses.
crons.cron(
  "sweep stale invitations",
  "0 4 * * *",
  internal.teamMembers.sweepInvitations,
  {},
);

// Start the campaigns whose scheduled time has arrived. `schedule` wrote a
// status and a date, the wizard offered a picker, and nothing ever read either:
// a scheduled campaign sat at `scheduled` for good and the only way to send was
// the manual menu item. Every minute, because a campaign timed for 18:00 that
// goes out at 18:05 is a different promise than the owner made.
crons.interval(
  "dispatch scheduled campaigns",
  { minutes: 1 },
  internal.emailCampaigns.dispatchScheduled,
  {},
);

// Start the win-back for customers who have gone quiet. Daily at 9am UTC: a
// "you have not been in a while" landing at 4am reads as a machine, and the
// sweep is cheap — it only walks stores that actually have such an automation.
crons.cron(
  "win back lapsed customers",
  "0 9 * * *",
  internal.emailAutomationActions.sweepInactive,
  {},
);

// Drop the provider webhook deliveries whose 30-day replay window has closed.
// The table is a deduplication window, not an audit log: nothing retries a
// webhook for anywhere near that long, and without a sweep it only grows.
// 5am UTC, between the invitation sweep and the win-back, so the three nightly
// jobs do not land on the same minute.
crons.cron(
  "sweep expired payment events",
  "0 5 * * *",
  internal.paymentEvents.sweepExpired,
  {},
);

// Ask Stripe about the checkouts that never came back paid.
//
// Every other path that marks an order paid is a message we have to RECEIVE:
// the guest landing on the confirmation page, or a webhook delivery. A customer
// who pays and closes the tab sends neither, and if the delivery is lost too the
// charge sits in Stripe behind an order at "pending" — money taken, kitchen
// blind, and nothing anywhere that would ever notice.
//
// Every fifteen minutes rather than nightly: the gap between the charge and the
// kitchen seeing the order is the whole cost of the defect, and a customer who
// paid at 19:40 cannot wait until 5am. The sweep reads one index range and does
// nothing at all when it is empty, which is almost always.
crons.interval(
  "reconcile pending stripe checkouts",
  { minutes: 15 },
  internal.stripe.reconcilePendingCheckouts,
  {},
);

// Delete kitchen tickets finished more than 30 days ago. The KDS reads are
// bounded now, but a bound on the read only moves the problem: the table still
// grows without limit and the completed history becomes unreadable. 2:30am UTC
// — clear of the invitation sweep at 4am, and outside service everywhere.
// The job reschedules itself a minute later while there is more to delete.
crons.cron(
  "purge expired kitchen tickets",
  "30 2 * * *",
  internal.kitchenTickets.purgeExpiredTickets,
  {},
);

// Carry away the personal data that has outlived the retention window — the
// diner's, not the establishment's. 3:15am UTC: clear of the kitchen-ticket
// purge at 2:30 and the invitation sweep at 4:00, so the three destructive
// nightly jobs never share a minute or a transaction budget.
//
// An order past the window is ANONYMISED, never deleted: it is the
// establishment's accounting record and art. L123-22 of the Code de commerce
// wants ten years of it. A game play, a contact message and a saved address
// are deleted outright — none of them is one. The window itself lives in
// `globalSettings.dataRetention` and defaults to the CNIL's three years.
crons.cron(
  "purge expired customer data",
  "15 3 * * *",
  internal.privacy.sweepExpiredCustomerData,
  {},
);

// The nightly backup. Every table the export carries, written to the client's
// own S3 bucket under `backups/`, kept 30 days by a lifecycle rule.
//
// `grep backup` in this file returned nothing until now, and `exportBackup`'s
// only caller was a button that downloaded a Blob to whatever laptop the
// administrator was sitting at — while the maintenance fee was sold on
// « Sauvegardes automatiques quotidiennes de vos données et contenus » (#366).
//
// 1:30am UTC, and the hour is chosen rather than free: it is before the three
// destructive nightly jobs (kitchen tickets at 2:30, customer data at 3:15,
// invitations at 4:00), so a copy exists of what they are about to carry away.
// A backup taken after the purge cannot restore what the purge removed.
crons.cron(
  "nightly backup",
  "30 1 * * *",
  internal.systemBackupOffsite.runNightlyBackup,
  {},
);

// Queue the articles an Auto Blog subscription is due. Hourly, because
// `preferredHour` is an hour: the planner asks each configuration whether this
// is its hour in its own timezone, and writes a queue row if it is. It calls
// no paid API — a sweep that finds nothing costs one indexed read.
crons.cron(
  "plan auto blog jobs",
  "0 * * * *",
  internal.blogAutoPlanner.planAutoBlogJobs,
  {},
);

// Generate what the planner queued. Every 10 minutes rather than hourly: an
// article scheduled for 09:00 that appears at 09:55 is not the promise the
// owner configured, and a generation that fails still has its retries inside
// the hour. The spec asks for 5-15 minutes (tasks/auto-blog-spec.md §4.2).
crons.interval(
  "execute auto blog queue",
  { minutes: 10 },
  internal.blogAutoGenerate.executeAutoBlogQueue,
  {},
);

// Ask Stripe whether this deployment's key still works, and record the answer.
// The checkout's card tile is armed from that verdict, so a key revoked or
// rolled takes the tile down rather than sending every diner into the redacted
// error #374 removed (#411).
//
// HOURLY, and that is about RECOVERY rather than detection. Detection is
// cheap: the first checkout attempt after a key goes bad reports it for free.
// Recovery is not — once the verdict disarms the tile no diner can reach the
// checkout, so the checkout cannot be what discovers the key has been put
// right, and this is the only writer left. Nightly meant an operator who fixed
// a key at 09:00 had no card payments until the next small hours. One Stripe
// call an hour is nothing; a day without cards is not.
crons.interval(
  "verify the Stripe key",
  { hours: 1 },
  internal.stripe.verifyStripeKey,
  {},
);

export default crons;
