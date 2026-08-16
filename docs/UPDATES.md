# Updates: engine → boilerplate → client sites

## Overview

```
┌──────────────────────────┐
│ beyours              │  logique métier + shell de référence
│ (monorepo, changesets)   │  apps/restaurant-theme + packages/*
└─────────┬────────────────┘
          │ ① publish npm (@be-in-digital/* → GitHub Packages)
          │ ② sync du shell (maintainer, voir § Maintenance)
          ▼
┌──────────────────────────┐
│ beyours-boilerplate  │  ce repo — template des sites
└─────────┬────────────────┘
          │ ③ pnpm update:engine   (canal npm)
          │ ④ pnpm update:template (canal git, remote `template`)
          ▼
┌──────────────────────────┐
│ site client (par resto)  │  zone client intouchée par ③ et ④
└──────────────────────────┘
```

Why two channels? Because the product lives in two places:

- The **business logic** (Convex functions, domain components, integrations)
  is **versioned on npm**. Update = semver bump, rollback = downgrade. This is
  the frequent, safe, granular channel.
- The **application shell** (`app/` routes, `convex/` wrappers, local
  components, configs, scripts) cannot live on npm (Next.js requires physical
  route files). It is updated through a **git merge** from the boilerplate.
  This is the rare channel (new pages, new wrappers).

A typical engine release is consumed like this: `update:engine` first; if the
release adds routes or wrappers, the boilerplate is resynced and the sites
then also run `update:template`.

## npm channel — `pnpm update:engine`

```bash
pnpm update:engine -- --check    # versions installées vs publiées
pnpm update:engine               # update DANS les ranges (^2.x)
pnpm update:engine -- --latest   # réécrit les ranges (franchit les majeures)
```

The script refuses to run in engine-link mode, chains `convex codegen` +
`typecheck` + `test` after the install, prints the per-package CHANGELOG
links, and exits non-zero if any check fails. Then commit `package.json`,
`pnpm-lock.yaml` and `convex/_generated/`.

After an update that touches the schema: `pnpm convex:deploy` (Convex
migrations are additive; breaking schema changes only land in an engine major,
with migration notes in the CHANGELOG).

## git channel — `pnpm update:template`

```bash
pnpm update:template -- --dry-run   # ce qui arriverait
pnpm update:template                # fetch + merge template/main
```

Prerequisite: a clean git tree. The `template` remote is created
automatically (by `pnpm setup` or by the script).

- **Site created by cloning** (recommended): standard incremental merge.
- **Site created with "Use this template"**: no common ancestor — do the first
  merge with `pnpm update:template -- --first`, subsequent ones are normal.

On a conflict the script prints the guide: engine zones → `--theirs`, client
zones → `--ours`. By contract the template never touches client zones, so
conflicts only appear if the site modified engine zones (avoid this, see
`docs/CUSTOMIZATION.md`).

## Patched files (boilerplate vs engine delta)

The boilerplate keeps a DELIBERATELY minimal delta against the engine's
`apps/restaurant-theme`:

| File | Nature of the patch |
| --- | --- |
| `app/layout.tsx` | metadata/fonts/theme from the site zone |
| `next.config.ts` | registry `transpilePackages` + images via `site.config.ts` |
| `eslint.config.mjs` | ignores `mobile/**` + `.template/**` (`PATCH BOILERPLATE` block) |
| `package.json` | `workspace:^` deps → registry versions `^2.x` |
| `tsconfig.json` | flattened monorepo base + excludes `mobile`/`.template` |
| `.env.example` | root-path header |

Everything else (`app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`,
`public/`, test configs) is an exact mirror. Every patched file carries a
`PATCH BOILERPLATE` header.

## Maintaining the boilerplate (BeYours team)

Resyncing the shell from the engine is **tooled and automated**:

- **`pnpm sync:engine`** (maintainer, local) — a strict mirror from
  `apps/restaurant-theme` of an engine clone (`--engine <path>`, `--check`
  for a dry run). The script protects the patched and boilerplate files,
  re-applies the `.env.example` header patch, reports the dependency diff
  (never auto-applied) and writes `.engine-sync.json` (the reference engine
  commit).
- **`.github/workflows/sync-engine.yml`** — weekday cron plus manual
  dispatch: clones the engine (secret `ENGINE_SYNC_TOKEN`, see
  `docs/SETUP-CI.md`), runs the resync and **opens a PR**
  `sync/engine-<sha>` when there is drift, with a validation checklist.

Validation before merging a sync PR:

```bash
pnpm engine:link ../beyours && pnpm typecheck && pnpm test && pnpm build
pnpm engine:unlink
```

Sites then pick it up through `update:template`.

## Operational reminders

- One Convex deployment per client; storefront on ISR/static by default.
- `NODE_AUTH_TOKEN`: a fine-grained `read:packages` PAT scoped to
  `@be-in-digital/*`, rotated every 90 days (CI: the `GH_PACKAGES_TOKEN`
  secret).
- Engine rollback: `pnpm update:engine` with the previous version pinned in
  `package.json` (git revert the update commit).
