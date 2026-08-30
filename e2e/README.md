# End-to-end tests

510 Playwright tests. Until August 2026 none of them had ever run — neither
locally nor in CI — so this file exists to make the setup explicit rather than
tribal.

## Why they were inert

Two independent gates, and neither says anything when it closes.

**Locally**, `playwright.config.ts` decides:

```ts
const hasRealBackend = !process.env.NEXT_PUBLIC_CONVEX_URL?.includes("placeholder")
```

Without a real Convex URL the `setup` and `admin` projects are not registered at
all. Playwright then reports success on the handful of public tests it did run —
there is no "skipped" line for a project that was never declared.

**In CI**, `.github/workflows/e2e.yml` is gated on `vars.CONVEX_E2E_ENABLED ==
'true'`, and then again on `secrets.E2E_NEXT_PUBLIC_CONVEX_URL` being non-empty.
A missing secret produces a `::warning::`, not a failure.

Three ways to be green while testing nothing. Anyone reading a passing PR would
reasonably conclude the suite ran.

## Running them locally

Everything below targets a deployment you are willing to see wiped: the seed
script creates accounts, and the suite writes orders, products and team members.

**1. Link a Convex deployment** (once). Writes `CONVEX_DEPLOYMENT` and
`NEXT_PUBLIC_CONVEX_URL` into `.env.local`, and pushes the functions:

```bash
cd apps/reference && npx convex dev
```

**2. Set what the BACKEND reads.** A Convex function does not see `.env.local` —
these have to live on the deployment:

```bash
npx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
```

```bash
npx convex env set ENCRYPTION_KEY "$(openssl rand -hex 32)"
```

```bash
npx convex env set SITE_URL http://localhost:3000
```

`ENCRYPTION_KEY` must be exactly 64 hex characters — it is the AES-256-GCM key
protecting the payment-provider tokens in `paymentConnections`.

**2 bis. Four variables a PRODUCTION server refuses to start without.**

`instrumentation.ts` validates them at boot, so `next start` dies before serving
anything. A dev server tolerates their absence, which is why this only bites
when running against a build. Placeholders are enough — no test reaches S3, SES
or OpenAI today:

```bash
export AWS_REGION=eu-west-3 AWS_ACCESS_KEY_ID=placeholder AWS_SECRET_ACCESS_KEY=placeholder OPENAI_API_KEY=sk-placeholder
```

**3. Set what the RUNNER reads.** Copy `.env.e2e.example` to `.env.e2e` and fill
it in, or export the variables. The one that matters most:

```bash
export SEED_PASSWORD="a-throwaway-password"
```

`scripts/seed-users.mts` writes it and `e2e/auth.setup.ts` signs in with it. The
two must agree. Neither hardcodes it — `auth.setup.ts` used to carry a literal,
and not even the matching one, so the setup only worked on the machine where
they happened to coincide.

**4. Seed the accounts**, with the dev server running:

```bash
pnpm dev
```

```bash
cd apps/reference && npx tsx scripts/seed-users.mts
```

Six accounts, all `test.*@beindigital.fr`: owner (`client_admin`), manager,
cuisine (`kitchen`), service (`waiter`), and two customers. They exercise the
role boundaries the authorisation tests assert.

**5. Run:**

```bash
cd apps/reference && pnpm test:e2e
```

Check the header names three projects — `setup`, `public`, `admin`. If it names
only `public`, the backend was not detected: re-read step 1 before reading any
result as a pass.

## Enabling CI

Set the repository **variable** `CONVEX_E2E_ENABLED` to `true`, and these
**secrets**. Point them at a deployment dedicated to CI, never the one a client
is served from:

| Secret | What it is |
| --- | --- |
| `E2E_NEXT_PUBLIC_CONVEX_URL` | `https://<deployment>.convex.cloud` — also the switch that turns the admin tests on |
| `E2E_CONVEX_SITE_URL` | `https://<deployment>.convex.site` (HTTP routes) |
| `E2E_CONVEX_DEPLOYMENT` | the deployment name |
| `E2E_CONVEX_DEPLOY_KEY` | a deploy key for it — steps 2 and 3 of the seed call `npx convex run`, and a runner has no logged-in CLI. Without it the accounts exist with no role and no restaurant, and every admin spec fails on an empty screen |
| `E2E_BETTER_AUTH_SECRET` | session signing key |
| `E2E_ENCRYPTION_KEY` | 64 hex characters |
| `E2E_SEED_PASSWORD` | the throwaway password from step 3 |

Optional, and only for the suites that touch them:
`E2E_AWS_REGION`, `E2E_AWS_ACCESS_KEY_ID`, `E2E_AWS_SECRET_ACCESS_KEY` (S3, SES)
and `E2E_OPENAI_API_KEY` (auto-translation). The workflow falls back to
placeholders, so the rest of the suite runs without them.

The Deliveroo webhook specs skip themselves unless `DELIVEROO_CLIENT_ID`,
`DELIVEROO_CLIENT_SECRET`, `DELIVEROO_WEBHOOK_SECRET`, `DELIVEROO_SITE_ID` and
`DELIVEROO_BRAND_ID` are present — a genuine `test.skip`, which does appear in
the report.

## Before trusting a green run

Neutralise something the suite claims to cover and confirm it goes red. A suite
that has never failed has never been shown to work: that is exactly how these
510 tests stayed inert for months while reporting success.
