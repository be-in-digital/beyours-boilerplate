# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

# BeYours boilerplate — rules for agents

This repo is the **template** for BeYours restaurant sites. A client site is a
clone of this repo. The shipped code comes from two sources:

1. **The npm packages `@be-in-digital/*`** (private GitHub Packages, published
   from [be-in-digital/beyours](https://github.com/be-in-digital/beyours)).
   `NODE_AUTH_TOKEN` (a `read:packages` PAT) is required for `pnpm install`.
   Without a token: `pnpm engine:link <engine-clone>` (local symlinks).
2. **The application shell** (`app/`, `components/`, `lib/`, `hooks/`, `cms/`,
   `convex/`): a mirror of the engine's `apps/reference`.

## Ownership zones — ABSOLUTE rule

- **ENGINE zones** (synced from the engine, never edit them on a client
  site): `app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`,
  `public/` (original files), root configs.
  Exceptions patched by the boilerplate (marked `PATCH BOILERPLATE` at the top
  of the file): `app/layout.tsx`, `next.config.ts`.
- **CLIENT zones** (per-site customization, never overwritten):
  `site.config.ts`, `site/` (theme.css, fonts.ts, components/), `.env*`,
  `.beindigital-site.json`, `mobile/` (self-contained Expo app, the
  "web + app" setup — enabled by `pnpm setup` or `pnpm add:mobile` from the
  `.template/mobile/` snapshot).
- **BOILERPLATE zone**: `templates/` (catalog of vertical designs:
  pizzeria, fast-food, food-truck, poulet, asiatique + default). Never
  touched by `sync:engine`; `pnpm template:apply <slug>` copies theme.css +
  fonts.ts into `site/`. Catalog rules (AA contrast, semantic tokens left
  alone, the engine variable contract): `templates/README.md`.
  `demos/` (sales tool): 50 full multipage site demos
  (5 categories × 10 themes, `assets/site.js` engine + `assets/themes.js`
  identities), multi-location, cancellable booking, **test-only** Stripe
  payments (an `sk_test_…` key in the Vercel env, never committed). AA
  contrast and layout uniqueness are verified by script.
  See `demos/README.md`.

A customization that cannot be done from the client zone is an engine change,
not a local patch.

## Updates (2 channels)

- `pnpm update:engine` — bumps the `@be-in-digital/*` packages (npm).
- `pnpm update:template` — git merge from the `template` remote
  (boilerplate). See `docs/UPDATES.md`.

## Commands

`pnpm create:site <directory>` (complete site, one shot) · `pnpm setup`
(wizard: web / web + app, design template) · `pnpm template:list|apply` ·
`pnpm add:mobile` · `pnpm env:setup|check|sync`
(all 3 .env files: web/convex/mobile) · `pnpm dev` · `pnpm build` ·
`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` ·
`pnpm convex:dev` · `pnpm convex:deploy` · `pnpm convex:env` ·
`pnpm ses:check` (is this AWS account out of the SES sandbox yet? — the
one onboarding step that waits on an AWS review, see
`tasks/client-aws-onboarding-runbook.md`)

## Convex

`convex/*.ts` are thin wrappers: they re-export the definitions from
`@be-in-digital/convex-functions` (`export const list = query(defs.list)`).
The schema composes tables from `@be-in-digital/convex-schema`. Do not write
business logic in `convex/` — it lives in the engine.
`convex/_generated/` is committed; regenerate it with `pnpm convex:codegen`.
