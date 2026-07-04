# BeInDigital Boilerplate

Template des sites restaurant BeInDigital. Chaque site client est un clone de
ce repo : il embarque le shell applicatif complet (storefront e-commerce,
dashboard admin, CMS, jeux QR, KDS cuisine) et consomme la logique métier
depuis les packages privés `@be-in-digital/*` publiés par
[beindigital-engine](https://github.com/be-in-digital/beindigital-engine).

```
engine (packages npm @be-in-digital/*)          ← logique métier, versionnée
   │  publish (changesets → GitHub Packages)
   ▼
boilerplate (ce repo)                            ← shell app + wrappers convex
   │  clone / merge git (remote `template`)
   ▼
site client (1 repo par restaurant)              ← site.config.ts + site/ + env
```

## Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **Tailwind CSS v4**
- **Convex** : backend (1 deployment par client) — schéma et fonctions
  fournis par `@be-in-digital/convex-schema` / `convex-functions`
- **Better Auth** (cookies web, rôles admin/customer, guest checkout)
- **Paiements** : Stripe, PayPal, SumUp · **Plateformes** : Uber Eats, Deliveroo
- **AWS** : S3 (médias), SES (emails) · **OpenAI** : traductions
- **Tests** : Vitest (unit) + Playwright (e2e)

## Créer un nouveau site client

Deux configurations : **web** (storefront + admin) ou **web + app**
(+ app mobile Expo cliente).

### La CLI `beindigital` (recommandée)

Installation (une fois, `gh` authentifié) :

```bash
gh api repos/be-in-digital/beindigital-boilerplate/contents/scripts/beindigital \
  -H "Accept: application/vnd.github.raw" > /opt/homebrew/bin/beindigital \
  && chmod +x /opt/homebrew/bin/beindigital
beindigital token ghp_xxx           # PAT read:packages, stocké chmod 600
```

Puis tout se fait au terminal :

```bash
beindigital create client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
beindigital create client-luigi --name "Chez Luigi" --mobile   # web + app
beindigital help · version · upgrade
```

La CLI va chercher les scripts sur ce repo à chaque appel — elle profite des
mises à jour du template sans réinstallation. Équivalent sans CLI :

```bash
gh api repos/be-in-digital/beindigital-boilerplate/contents/scripts/create-site.mjs \
  -H "Accept: application/vnd.github.raw" | node --input-type=module - \
  client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
```

La commande enchaîne : clone du template → remote `template` (mises à jour) →
création du repo GitHub privé → `pnpm install` → configuration complète
(`site.config.ts`, secrets générés, `.env.local`, app mobile si demandée) →
commit initial → push. Depuis un clone existant : `pnpm create:site <dossier> [options]`.

### À la main (équivalent)

```bash
git clone https://github.com/be-in-digital/beindigital-boilerplate.git client-luigi
cd client-luigi && git remote rename origin template
export NODE_AUTH_TOKEN=ghp_xxx
pnpm install
pnpm setup            # wizard : nom, description, locale, web / web + app
```

Puis provisionner le backend et les variables d'environnement :

```bash
pnpx convex dev      # crée le deployment, remplit .env.local
pnpm env:setup       # wizard .env : requis + intégrations (Stripe, AWS, Uber…)
pnpm convex:env      # pousse .env.convex côté Convex
pnpm dev
```

### Variables d'environnement — une commande pour les 3 fichiers

Un site a trois fichiers d'env : `.env.local` (web, source de vérité),
`.env.convex` (backend) et `mobile/.env` (app). La commande `env` évite la
triple saisie :

| Commande | Rôle |
| --- | --- |
| `pnpm env:setup` | Wizard : secrets auto-générés, requis, puis activation intégration par intégration (Stripe, AWS, PayPal, SumUp, OpenAI, Uber Eats, Deliveroo, Maps, Sentry, Unsplash) |
| `pnpm env:check` | État : requis manquants, intégrations incomplètes, fichiers désynchronisés (exit ≠ 0 si problème) |
| `pnpm env:sync` | Propage `.env.local` → `.env.convex` (clés partagées) et → `mobile/.env` (URL Convex) |

`env:setup` marche aussi en mode pipé (réponses via stdin) pour
l'automatisation. Après toute modification : `pnpm convex:env` applique
`.env.convex` au deployment (`convex env set`).

Un site web peut activer l'app mobile plus tard : `pnpm add:mobile`
(copie `.template/mobile/` → `mobile/`, app Expo autonome branchée sur le
même backend Convex — voir `.template/mobile/README.md`).

> Le bouton GitHub « Use this template » fonctionne aussi, mais casse
> l'historique commun : le premier `pnpm update:template` devra être lancé
> avec `-- --first`. Le clone (ce que fait `create-site`) est la voie
> recommandée.

## Personnaliser le site

Toute la personnalisation vit dans la **zone client** — jamais dans le code
engine :

| Quoi | Où |
| --- | --- |
| Nom, SEO, locale, hôtes d'images | `site.config.ts` |
| Couleurs / design tokens | `site/theme.css` |
| Polices | `site/fonts.ts` |
| Composants custom | `site/components/` |
| Logos, favicon, images | `public/` |
| Contenus, horaires, menus, textes | Dashboard admin (CMS + réglages, stockés dans Convex) |

Détails et limites : [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md).

## Mettre à jour un site

Deux canaux complémentaires ([`docs/UPDATES.md`](docs/UPDATES.md)) :

```bash
pnpm update:engine     # logique métier : bump @be-in-digital/* (npm, semver)
pnpm update:template   # shell app : merge git depuis le remote `template`
```

`update:engine -- --check` liste les versions sans rien toucher ;
`--latest` franchit les majeures (breaking). Chaque update enchaîne
codegen + typecheck + tests et pointe vers les CHANGELOGs de l'engine.

## Développer contre un engine local (sans registre)

```bash
git clone https://github.com/be-in-digital/beindigital-engine ../beindigital-engine
pnpm engine:link       # overrides pnpm link: vers le clone
# … dev …
pnpm engine:unlink     # retour au registre (ne jamais commiter en mode link)
```

## Scripts

| Commande | Rôle |
| --- | --- |
| `pnpm create:site <dossier>` | Crée un site complet (clone + repo + config) |
| `pnpm setup` | Initialise un site client (idempotent, web / web + app) |
| `pnpm add:mobile` | Active l'app mobile Expo sur un site web |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` / `test:e2e` | Qualité |
| `pnpm convex:dev` / `convex:deploy` / `convex:codegen` | Backend Convex |
| `pnpm env:setup` / `env:check` / `env:sync` | Gestion des 3 fichiers .env (web/convex/mobile) |
| `pnpm convex:env` | Applique `.env.convex` via `convex env set` |
| `pnpm update:engine` / `update:template` | Mises à jour |
| `pnpm sync:engine` | (Mainteneur) resync du miroir depuis l'engine |
| `pnpm engine:link` / `engine:unlink` | Dev local contre l'engine |

## Déploiement

**Web (Vercel)** : importer le repo, framework Next.js, racine du repo.
Env vars : toutes les `[REQUIS]` de `.env.example` + `NODE_AUTH_TOKEN`
(secret, pour l'install). Convex prod : `pnpm convex:deploy` puis reporter
`NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SITE_URL` de prod dans Vercel.

**CI GitHub Actions** : `ci.yml` (lint + typecheck + tests + build, secret
`GH_PACKAGES_TOKEN` requis ; e2e via `CONVEX_E2E_ENABLED=true` + secrets
`E2E_*` ; job mobile conditionnel) et `sync-engine.yml` (resync automatique
du miroir engine par PR). Runbook complet des secrets :
[`docs/SETUP-CI.md`](docs/SETUP-CI.md).

## Sécurité

- **PCI SAQ-A** : jamais de numéro de carte côté serveur — Stripe Elements
  côté client, webhooks server-side uniquement.
- `BETTER_AUTH_SECRET` et `NODE_AUTH_TOKEN` : rotation 90 jours.
- `ENCRYPTION_KEY` chiffre les tokens OAuth au repos (Convex).
- CORS : les HTTP actions Convex valident l'`Origin` contre `SITE_URL`.

## Architecture & décisions

- [`docs/design/boilerplate-v2.md`](docs/design/boilerplate-v2.md) — ADR du
  boilerplate v2 (pourquoi single-app, pourquoi deux canaux de mise à jour)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — design system de l'app
- [`docs/UPDATES.md`](docs/UPDATES.md) · [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md)
