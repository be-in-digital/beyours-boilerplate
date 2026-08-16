<!-- Generated automatically — do not edit here. -->

> ⚠️ **Generated repository.** Its contents are produced from `apps/themes` in
> the [beyours](https://github.com/be-in-digital/beyours)
> monorepo and replaced in full on every sync. **A commit made directly here
> will be lost** — changes belong in the monorepo.
>
> This repository exists because a client site cannot clone a subdirectory of a
> monorepo: it is the shippable cut, with the engine packages at published
> versions and a lockfile of its own.

# `apps/themes` — the client site template

The site every restaurant receives. It carries the complete application shell —
e-commerce storefront, admin dashboard, CMS, QR games, kitchen display — and
consumes the business logic from the `@be-in-digital/*` packages.

Each client is a **git clone** of it, with their own repository, their own
Convex backend and their own Vercel project.

```
packages/*  (published as @be-in-digital/*)   ← business logic, versioned
   │  publish (changesets → GitHub Packages)
   ▼
apps/themes                                   ← app shell + convex wrappers
   │  git clone / merge (remote `template`)
   ▼
client repository (1 per restaurant)          ← site.config.ts + site/ + env
```

> **Why "themes".** This directory carries the catalogue: `templates/`, 51 art
> directions, one per theme sold. That is what the restaurant owner picks and
> pays for. The application around it is the rendering engine that brings the
> chosen theme to life — a client applies exactly one, tuned to their brand.

> ⚠️ **Clients do not clone this directory, they clone the mirror repository**
> `be-in-digital/beyours-boilerplate`. Here the engine dependencies are
> `workspace:^` (we develop against the current engine); over there they are
> published versions, with their own lockfile.
>
> The crossing is automated: `.github/workflows/publish-mirror.yml` pushes this
> directory to the mirror on every change, and after every package
> publication. See
> [`scripts/publish-mirror.mjs`](../../scripts/publish-mirror.mjs) at the
> monorepo root for the four transformations applied.

---

## In one minute

| | |
| --- | --- |
| **What it is** | The deliverable — 98 routes, 51 design templates, 50 sales demos |
| **Who uses it** | One restaurant owner per clone, plus the team that creates the sites |
| **What comes from the engine** | 9 `@be-in-digital/*` packages — logic, Convex schema, UI, admin |
| **What is specific to the template** | The client zone, the templates, the creation and update scripts, the demos |
| **Data isolation** | 1 Convex deployment per client — structural, not enforced in code |

---

## The demos: the sales tool

`demos/` holds **50 browsable static storefronts**, one per template, with a
menu, a cart and Stripe payments in test mode. A prospect tries the site before
buying it, with nothing provisioned.

```bash
# offline, no dependencies
open demos/index.html
```

![Demo catalogue](../../docs/captures/demos-catalogue.png)

It is plain HTML/CSS/JS: no build, no server, no backend. The `demos.yml`
workflow validates them (AA contrast, layout uniqueness, price consistency) in a
few seconds.

Each demo covers both faces of the product — the storefront the end customer
sees, and the back office the restaurant owner sees:

![Storefront](../../docs/captures/demo-storefront.png)

![Back office](../../docs/captures/demo-admin.png)

---

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **Tailwind CSS v4**
- **Convex**: backend (1 deployment per client) — schema and functions provided
  by `@be-in-digital/convex-schema` / `convex-functions`
- **Better Auth** (web cookies, admin/customer roles, guest checkout)
- **Payments**: Stripe, PayPal, SumUp · **Platforms**: Uber Eats, Deliveroo
- **AWS**: S3 (media), SES (email) · **OpenAI**: translations
- **Tests**: Vitest (unit) + Playwright (e2e)

## Creating a new client site

Two configurations: **web** (storefront + admin) or **web + app** (plus an Expo
mobile customer app).

### The `beyours` CLI (recommended)

Install once, with `gh` authenticated:

```bash
gh api repos/be-in-digital/beyours-boilerplate/contents/scripts/beyours \
  -H "Accept: application/vnd.github.raw" > /opt/homebrew/bin/beyours \
  && chmod +x /opt/homebrew/bin/beyours
beyours token ghp_xxx           # read:packages PAT, stored chmod 600
```

> The CLI was called `beindigital` before August 2026. An existing installation
> keeps working; reinstall under the new name and delete the old binary.

Then everything happens in the terminal:

```bash
beyours create client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
beyours create client-luigi --name "Chez Luigi" --mobile   # web + app
beyours create client-luigi --name "Chez Luigi" --template pizzeria   # vertical design
beyours help · version · upgrade
```

The CLI fetches its scripts from the mirror repository on every call, so it
picks up template updates without reinstalling. Equivalent without the CLI:

```bash
gh api repos/be-in-digital/beyours-boilerplate/contents/scripts/create-site.mjs \
  -H "Accept: application/vnd.github.raw" | node --input-type=module - \
  client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
```

The command chains: clone the template → `template` remote (for updates) →
create the private GitHub repository → `pnpm install` → full configuration
(`site.config.ts`, generated secrets, `.env.local`, mobile app if requested) →
initial commit → push. From an existing clone: `pnpm create:site <dir> [options]`.

### By hand (equivalent)

```bash
git clone https://github.com/be-in-digital/beyours-boilerplate.git client-luigi
cd client-luigi && git remote rename origin template
export NODE_AUTH_TOKEN=ghp_xxx
pnpm install
pnpm setup            # wizard: name, description, locale, web / web + app, design template
```

Then provision the backend and the environment variables:

```bash
pnpx convex dev      # creates the deployment, fills .env.local
pnpm env:setup       # .env wizard: required values + integrations (Stripe, AWS, Uber…)
pnpm convex:env      # pushes .env.convex to Convex
pnpm dev
```

### Environment variables — one command for all three files

A site has three env files: `.env.local` (web, source of truth), `.env.convex`
(backend) and `mobile/.env` (app). The `env` command avoids entering everything
three times:

| Command | Role |
| --- | --- |
| `pnpm env:setup` | Wizard: auto-generated secrets, required values, then integration-by-integration activation (Stripe, AWS, PayPal, SumUp, OpenAI, Uber Eats, Deliveroo, Maps, Sentry, Unsplash) |
| `pnpm env:check` | Status: missing required values, incomplete integrations, out-of-sync files (non-zero exit on problems) |
| `pnpm env:sync` | Propagates `.env.local` → `.env.convex` (shared keys) and → `mobile/.env` (Convex URL) |

`env:setup` also works piped (answers on stdin) for automation. After any
change, `pnpm convex:env` applies `.env.convex` to the deployment
(`convex env set`).

A web-only site can enable the mobile app later with `pnpm add:mobile` (copies
`.template/mobile/` → `mobile/`, a standalone Expo app wired to the same Convex
backend — see `.template/mobile/README.md`).

> GitHub's "Use this template" button also works, but breaks the shared
> history: the first `pnpm update:template` will need `-- --first`. Cloning
> (what `create-site` does) is the recommended path.

## Customising the site

All customisation lives in the **client zone** — never in engine code:

| What | Where |
| --- | --- |
| Name, SEO, locale, image hosts | `site.config.ts` |
| Colours / design tokens | `site/theme.css` |
| Fonts | `site/fonts.ts` |
| Custom components | `site/components/` |
| Logos, favicon, images | `public/` |
| Content, opening hours, menus, copy | Admin dashboard (CMS + settings, stored in Convex) |

Details and limits: [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md).

### Design templates (5 ready-made verticals)

A template lays down the full identity (light/dark colours, fonts, shapes) in
the client zone; colours are then tuned to the client's brand in
`site/theme.css`:

| Slug | Direction |
| --- | --- |
| `pizzeria` | Trattoria: wood-oven terracotta, Italian didone |
| `fast-food` | Smash: mustard on charcoal, fleshy grotesque |
| `food-truck` | Convoy: enamelled petrol on kraft, condensed stencil |
| `poulet` | Embers: chilli red on cream, poster condensed |
| `asiatique` | Izakaya: jade and ink on washi, Japanese gothic |

```bash
pnpm template:list             # catalogue
pnpm template:apply poulet     # applies it (or --template at creation time)
```

Visual preview: open `templates/preview.html`. Detailed art direction (palette,
imagery, tone, client adaptation): [`templates/README.md`](templates/README.md)
and `templates/<slug>/DESIGN.md`.

## Updating a site

Two complementary channels ([`docs/UPDATES.md`](docs/UPDATES.md)):

```bash
pnpm update:engine     # business logic: bump @be-in-digital/* (npm, semver)
pnpm update:template   # app shell: git merge from the `template` remote
```

`update:engine -- --check` lists versions without touching anything; `--latest`
crosses major versions (breaking). Each update chains codegen + typecheck +
tests and points at the engine changelogs.

## Developing against a local engine (no registry)

```bash
git clone https://github.com/be-in-digital/beyours ../beyours
pnpm engine:link       # pnpm link: overrides pointing at the clone
# … develop …
pnpm engine:unlink     # back to the registry (never commit in link mode)
```

## Scripts

| Command | Role |
| --- | --- |
| `pnpm create:site <dir>` | Creates a complete site (clone + repo + config) |
| `pnpm setup` | Initialises a client site (idempotent, web / web + app) |
| `pnpm add:mobile` | Enables the Expo mobile app on a web site |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` / `test:e2e` | Quality |
| `pnpm convex:dev` / `convex:deploy` / `convex:codegen` | Convex backend |
| `pnpm env:setup` / `env:check` / `env:sync` | Managing the 3 .env files (web/convex/mobile) |
| `pnpm convex:env` | Applies `.env.convex` through `convex env set` |
| `pnpm template:list` / `template:apply <slug>` | Design templates (5 verticals + neutral) |
| `pnpm update:engine` / `update:template` | Updates |
| `pnpm engine:link` / `engine:unlink` | Local development against the engine |

## Deployment

**Web (Vercel)**: import the repository, Next.js framework, repository root.
Environment variables: every `[REQUIS]` entry from `.env.example` plus
`NODE_AUTH_TOKEN` (secret, for the install). Convex production:
`pnpm convex:deploy`, then copy the production `NEXT_PUBLIC_CONVEX_URL` /
`CONVEX_SITE_URL` into Vercel.

**GitHub Actions CI**: `ci.yml` (lint + typecheck + tests + build, requires the
`GH_PACKAGES_TOKEN` secret; e2e through `CONVEX_E2E_ENABLED=true` plus the
`E2E_*` secrets; conditional mobile job). Full secrets runbook:
[`docs/SETUP-CI.md`](docs/SETUP-CI.md).

## Security

- **PCI SAQ-A**: no card number ever reaches the server — Stripe Elements on the
  client, webhooks server-side only.
- `BETTER_AUTH_SECRET` and `NODE_AUTH_TOKEN`: 90-day rotation.
- `ENCRYPTION_KEY` encrypts OAuth tokens at rest (Convex).
- CORS: the Convex HTTP actions validate `Origin` against `SITE_URL`.

## Architecture and decisions

- [`docs/design/boilerplate-v2.md`](docs/design/boilerplate-v2.md) — the
  boilerplate v2 ADR (why single-app, why two update channels)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — the app's design system
- [`docs/UPDATES.md`](docs/UPDATES.md) · [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md)

---

## Things to watch

**`update:template` does not check the maintenance contract.** The business
model says an expired site stays frozen on the last covered release
(`packages/convex-functions/src/maintenance.ts`). In practice,
`scripts/update-template.mjs` runs a bare `git fetch template`: an expired site
that runs the command receives everything. The guard is still to be written.

**This directory's `.github/` is not inert.** GitHub only reads the `.github/`
at the repository root, so these workflows do not run here — but they are part
of the cloned payload, and they do run in the client's repository. Do not delete
them.

**Three template lists coexist**: 51 directories in `templates/`, 50 demos in
`demos/`, 52 entries in `apps/site/lib/templates-data.ts`. No test reconciles
them.

---

## Picking up this app

1. The [root README](../../README.md) for monorepo context, then this one.
2. Open `demos/index.html` — that is the product, browsable with nothing
   installed.
3. [`docs/design/boilerplate-v2.md`](docs/design/boilerplate-v2.md) to
   understand why there are two update channels, then
   [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md) for the boundary between the
   client zone and the engine zone — that contract is what lets updates land
   without conflicts.
4. `scripts/create-site.mjs` then `scripts/init.mjs`: the whole site-creation
   path lives there.
5. `pnpm dev:themes` from the root, with `convex dev` in a second terminal.
