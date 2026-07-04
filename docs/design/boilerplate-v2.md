# Boilerplate v2 — refonte complète

> Statut : ACCEPTED (2026-07-04)
> Supersède : `monorepo-restructure.md` (supprimé — voir historique git)

## Contexte

Le boilerplate v1 était un monorepo pnpm+Turborepo (apps/web + apps/mobile
placeholder + packages/backend) construit incrémentalement, en avance de
phase sur certaines versions (Next 16.2, convex 1.34) et en retard sur le
périmètre engine (~25 wrappers convex sur ~50 modules publiés, storefront
partiel). Demande : repartir de zéro pour obtenir un template **prêt à
l'emploi pour chaque site client, personnalisable totalement, et qui reçoit
les mises à jour du repo engine**.

## Décisions

### D1 — Le boilerplate est le miroir de `apps/restaurant-theme`

L'app de référence de l'engine est épaisse (~440 fichiers TS : 128 routes,
160 composants locaux, 94 wrappers convex). Un shell « thin » 100 % npm est
impossible aujourd'hui : Next.js exige des fichiers de route physiques et le
shell n'est pas packagé. Le boilerplate copie donc l'app de référence à
l'identique — c'est le produit vendu — et la logique métier reste consommée
via les packages npm `@be-in-digital/*` (GitHub Packages, source TS).

Conséquence assumée : le boilerplate doit être resynchronisé quand le shell
engine évolue (procédure § UPDATES.md, delta patché minimal : 2 fichiers
app + 3 configs).

### D2 — Single-app, plus de monorepo

Suppression de turbo/pnpm-workspace/apps/packages :

- Un site client = UNE app Next.js + `convex/`. Le monorepo ne servait que
  le mobile hypothétique (placeholder jamais rempli, absent de l'engine).
- `packages/backend` (re-export `@repo/backend`) n'a plus de raison d'être :
  imports directs `@/convex/_generated/api`, comme dans l'engine — ce qui
  rend la copie du shell exacte, sans réécriture d'imports.
- Maintenance par site drastiquement réduite (~10 clients/mainteneur).

Si le mobile revient, il sera un produit engine à part avec son propre
template — pas un placeholder dormant dans chaque site.

**Addendum (même jour)** — la config « web + app » est réintroduite à la
demande, SANS monorepo : `mobile/` est une app Expo **autonome** (propre
`package.json`, install indépendant, aucun package privé), branchée sur le
même backend Convex via `EXPO_PUBLIC_CONVEX_URL`. Le snapshot dormant vit
dans `.template/mobile/` (activation : `pnpm setup` choix 2, ou
`pnpm add:mobile`), la racine web reste single-app. Tant que l'engine ne
publie pas de produit mobile, `mobile/` est **zone client** (point de
départ, pas de canal de mise à jour). Création one-shot :
`scripts/create-site.mjs` (clone + repo GitHub + install + config + push).

### D3 — Versions alignées sur l'engine, pas en avance

next 16.1.6, convex 1.31.7 (exact), better-auth 1.4.9 (exact),
@convex-dev/better-auth ^0.10.10 : la combinaison testée par l'engine. Le
v1 avait bumpé en avance (Next 16.2, convex 1.34) au prix de contournements
(proxy auth custom, `ignoreBuildErrors: true`). Les montées de version
viennent de l'engine, le boilerplate suit.

### D4 — Deux canaux de mise à jour

- **npm** (`update:engine`) : logique métier versionnée semver. Fréquent,
  granulaire, rollbackable.
- **git** (`update:template`, remote `template`) : shell + wrappers +
  configs. Rare. Merge propre car les sites ne modifient que la zone client.

Création de site par **clone** (historique commun → merges incrémentaux) ;
« Use this template » supporté via `--first` (--allow-unrelated-histories).

### D5 — Contrat de zones client/engine

Zone client = `site.config.ts` + `site/` (theme.css, fonts.ts, components/)
+ `public/` + `.env*`. Zone engine = tout le reste, non modifiable sur un
site. Les deux seuls fichiers engine patchés par le boilerplate
(`app/layout.tsx`, `next.config.ts`) portent un en-tête `PATCH BOILERPLATE`.
La personnalisation runtime (contenus, horaires, couleurs de sections CMS)
reste dans Convex via le dashboard — le contrat ne couvre que le build-time.

### D6 — Mode engine-link pour le dev et la CI locale

`pnpm engine:link <clone>` pose des overrides pnpm `link:` vers un clone
local de l'engine (installé), permettant install/typecheck/build sans
`NODE_AUTH_TOKEN` et le dev engine+site en parallèle. Garde-fous : preinstall
skip token en mode link, CI refuse un `package.json` contenant `link:`,
`engine:unlink` purge overrides et lockfile contaminé.

### D7 — Pas de lockfile commité au premier commit

Le lockfile registre ne peut être généré qu'avec un token. Le premier
`pnpm install` tokené (mainteneur ou CI) le produit ; il est alors commité
et le CI passe en `--frozen-lockfile` automatiquement.

## Risques surveillés

1. **Drift boilerplate ↔ engine** : le shell copié vieillit si les releases
   engine ne déclenchent pas la resync. Mitigation : procédure documentée,
   automatisation `repository_dispatch` en backlog.
2. **Sites qui patchent la zone engine** : conflits à `update:template`.
   Mitigation : contrat documenté (CUSTOMIZATION.md), guide de résolution
   dans le script, review des repos clients.
3. **Packages TS-source dans node_modules** : nécessite `transpilePackages`
   exhaustif (next.config.ts) — vérifié par le build CI.
