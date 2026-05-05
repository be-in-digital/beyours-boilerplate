# `apps/web/e2e`

Playwright E2E tests for the storefront and admin flows.

## Prerequisites

- Convex demo data must be seeded:
  ```bash
  pnpx convex run seed:runSeed
  ```
- `.env.local` filled with at least the [REQUIS] section of `.env.example`

## Run locally

```bash
# headed (see browser, useful for debugging)
pnpm --filter web exec playwright test --headed

# headless (default)
pnpm --filter web exec playwright test

# UI mode (recommended)
pnpm --filter web exec playwright test --ui
```

The first run downloads browsers (~150MB) and launches a dev server on port 3001.

## Reuse existing server

If you already have a dev server running on a different port:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm --filter web exec playwright test
```

## Tests included

- `storefront.spec.ts` — landing, stores, menu, cart, account flows. Does not
  cover Stripe checkout (needs Stripe keys, see `checkout.spec.ts` if added later).
