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

export default crons;
