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

```bash
# 1. Cloner (garder l'historique = mises à jour template propres)
git clone https://github.com/be-in-digital/beindigital-boilerplate.git client-luigi
cd client-luigi
git remote rename origin template
git remote add origin git@github.com:be-in-digital/client-luigi.git

# 2. Installer (PAT GitHub scope read:packages)
export NODE_AUTH_TOKEN=ghp_xxx
pnpm install

# 3. Initialiser le site (nom, secrets, .env.local, sentinel)
pnpm setup

# 4. Provisionner Convex + env backend
pnpx convex dev                      # crée le deployment, remplit .env.local
cp .env.convex.example .env.convex   # remplir les intégrations actives
pnpm convex:env

# 5. Lancer
pnpm dev
```

> Le bouton GitHub « Use this template » fonctionne aussi, mais casse
> l'historique commun : le premier `pnpm update:template` devra être lancé
> avec `-- --first`. Le clone est la voie recommandée.

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
| `pnpm setup` | Initialise un site client (idempotent) |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` / `test` / `test:e2e` | Qualité |
| `pnpm convex:dev` / `convex:deploy` / `convex:codegen` | Backend Convex |
| `pnpm convex:env` | Applique `.env.convex` via `convex env set` |
| `pnpm update:engine` / `update:template` | Mises à jour |
| `pnpm engine:link` / `engine:unlink` | Dev local contre l'engine |

## Déploiement

**Web (Vercel)** : importer le repo, framework Next.js, racine du repo.
Env vars : toutes les `[REQUIS]` de `.env.example` + `NODE_AUTH_TOKEN`
(secret, pour l'install). Convex prod : `pnpm convex:deploy` puis reporter
`NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SITE_URL` de prod dans Vercel.

**CI GitHub Actions** (`.github/workflows/ci.yml`) : lint + typecheck +
tests + build sur chaque PR (secret `GH_PACKAGES_TOKEN` requis). E2E
Playwright activables avec la variable `CONVEX_E2E_ENABLED=true` + secrets
`E2E_*` (deployment Convex de test dédié).

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
