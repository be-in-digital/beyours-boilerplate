# Mises à jour : engine → boilerplate → sites clients

## Vue d'ensemble

```
┌──────────────────────────┐
│ beyours-engine       │  logique métier + shell de référence
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

Pourquoi deux canaux ? Parce que le produit vit à deux endroits :

- La **logique métier** (fonctions Convex, composants métier, intégrations)
  est **versionnée en npm**. Mise à jour = bump semver, rollback = downgrade.
  C'est le canal fréquent, sûr, granulaire.
- Le **shell applicatif** (routes `app/`, wrappers `convex/`, composants
  locaux, configs, scripts) ne peut pas vivre en npm (Next.js exige des
  fichiers de route physiques). Il se met à jour par **merge git** depuis le
  boilerplate. C'est le canal rare (nouvelles pages, nouveaux wrappers).

Une release engine typique se consomme : `update:engine` d'abord ; si la
release ajoute des routes/wrappers, le boilerplate est resynchronisé puis les
sites font aussi `update:template`.

## Canal npm — `pnpm update:engine`

```bash
pnpm update:engine -- --check    # versions installées vs publiées
pnpm update:engine               # update DANS les ranges (^2.x)
pnpm update:engine -- --latest   # réécrit les ranges (franchit les majeures)
```

Le script refuse le mode engine-link, enchaîne `convex codegen` +
`typecheck` + `test` après install, affiche les liens CHANGELOG par package,
et sort en erreur si une vérification échoue. Committer ensuite
`package.json`, `pnpm-lock.yaml` et `convex/_generated/`.

Après un update qui touche le schéma : `pnpm convex:deploy` (les migrations
Convex sont additives ; les breaking changes de schéma arrivent uniquement
dans une majeure engine, avec notes de migration dans le CHANGELOG).

## Canal git — `pnpm update:template`

```bash
pnpm update:template -- --dry-run   # ce qui arriverait
pnpm update:template                # fetch + merge template/main
```

Pré-requis : arbre git propre. Le remote `template` est créé automatiquement
(par `pnpm setup` ou par le script).

- **Site créé par clone** (recommandé) : merge incrémental standard.
- **Site créé via « Use this template »** : pas d'ancêtre commun — premier
  merge avec `pnpm update:template -- --first`, les suivants sont normaux.

En cas de conflit, le script affiche le guide : zones engine → `--theirs`,
zones client → `--ours`. Par contrat, le template ne touche jamais aux zones
client, donc les conflits n'apparaissent que si le site a modifié des zones
engine (à éviter, cf. `docs/CUSTOMIZATION.md`).

## Fichiers patchés (delta boilerplate vs engine)

Le boilerplate maintient un delta VOLONTAIREMENT minimal vs
`apps/restaurant-theme` de l'engine :

| Fichier | Nature du patch |
| --- | --- |
| `app/layout.tsx` | métadonnées/fonts/theme depuis la zone site |
| `next.config.ts` | `transpilePackages` registre + images via `site.config.ts` |
| `eslint.config.mjs` | ignores `mobile/**` + `.template/**` (bloc `PATCH BOILERPLATE`) |
| `package.json` | deps `workspace:^` → versions registre `^2.x` |
| `tsconfig.json` | base monorepo aplatie + exclude `mobile`/`.template` |
| `.env.example` | en-tête chemins racine |

Tout le reste (`app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`,
`public/`, configs de test) est un miroir exact. Chaque fichier patché porte
un en-tête `PATCH BOILERPLATE`.

## Maintenance du boilerplate (équipe BeYours)

La resync du shell depuis l'engine est **outillée et automatisée** :

- **`pnpm sync:engine`** (mainteneur, local) — miroir strict depuis
  `apps/restaurant-theme` d'un clone engine (`--engine <chemin>`,
  `--check` pour un dry-run). Le script protège les fichiers patchés et
  boilerplate, ré-applique le patch d'en-tête de `.env.example`, rapporte le
  diff de dépendances (jamais auto-appliqué) et écrit `.engine-sync.json`
  (commit engine de référence).
- **`.github/workflows/sync-engine.yml`** — cron jours ouvrés + déclenchement
  manuel : clone l'engine (secret `ENGINE_SYNC_TOKEN`, cf.
  `docs/SETUP-CI.md`), lance la resync et **ouvre une PR** `sync/engine-<sha>`
  quand il y a une dérive, avec checklist de validation.

Validation avant merge d'une PR de sync :

```bash
pnpm engine:link ../beyours-engine && pnpm typecheck && pnpm test && pnpm build
pnpm engine:unlink
```

Les sites récupèrent ensuite via `update:template`.

## Rappels d'exploitation

- 1 deployment Convex par client ; storefront en ISR/statique par défaut.
- `NODE_AUTH_TOKEN` : PAT fine-grained `read:packages` limité à
  `@be-in-digital/*`, rotation 90 j (CI : secret `GH_PACKAGES_TOKEN`).
- Rollback engine : `pnpm update:engine` avec la version précédente dans
  `package.json` (git revert du commit d'update).
