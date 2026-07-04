# Mises à jour : engine → boilerplate → sites clients

## Vue d'ensemble

```
┌──────────────────────────┐
│ beindigital-engine       │  logique métier + shell de référence
│ (monorepo, changesets)   │  apps/restaurant-theme + packages/*
└─────────┬────────────────┘
          │ ① publish npm (@be-in-digital/* → GitHub Packages)
          │ ② sync du shell (maintainer, voir § Maintenance)
          ▼
┌──────────────────────────┐
│ beindigital-boilerplate  │  ce repo — template des sites
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
| `package.json` | deps `workspace:^` → versions registre `^2.x` |
| `tsconfig.json` | base monorepo aplatie |
| `.env.example` | en-tête chemins racine |

Tout le reste (`app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`,
`public/`, configs de test) est un miroir exact. Chaque fichier patché porte
un en-tête `PATCH BOILERPLATE`.

## Maintenance du boilerplate (équipe BeInDigital)

Resynchroniser le boilerplate après une release engine qui modifie le shell :

```bash
# depuis un clone du boilerplate, engine cloné à côté
rsync -a --delete \
  --exclude node_modules --exclude .next \
  --exclude CHANGELOG.md --exclude SETUP_SUMMARY.md \
  --exclude DASHBOARD_IMPLEMENTATION.md \
  ../beindigital-engine/apps/restaurant-theme/app/ ./app/
# idem pour components/ lib/ hooks/ cms/ convex/ e2e/ public/
git diff   # ré-appliquer les patchs listés ci-dessus s'ils ont sauté
pnpm engine:link ../beindigital-engine && pnpm typecheck && pnpm test
pnpm engine:unlink
```

Puis committer sur `main` du boilerplate : les sites récupèrent via
`update:template`. (Automatisation possible plus tard : workflow
`repository_dispatch` déclenché par la release engine.)

## Rappels d'exploitation

- 1 deployment Convex par client ; storefront en ISR/statique par défaut.
- `NODE_AUTH_TOKEN` : PAT fine-grained `read:packages` limité à
  `@be-in-digital/*`, rotation 90 j (CI : secret `GH_PACKAGES_TOKEN`).
- Rollback engine : `pnpm update:engine` avec la version précédente dans
  `package.json` (git revert du commit d'update).
