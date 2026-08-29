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

export default crons;
