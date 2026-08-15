# `apps/boilerplate` — le gabarit des sites clients

Le site que chaque restaurant reçoit. Il embarque le shell applicatif complet
— storefront e-commerce, dashboard admin, CMS, jeux QR, écran cuisine — et
consomme la logique métier depuis les paquets `@be-in-digital/*`.

Chaque client en est un **clone git**, avec son propre dépôt, son propre backend
Convex et son propre projet Vercel.

```
packages/*  (publiés en @be-in-digital/*)        ← logique métier, versionnée
   │  publish (changesets → GitHub Packages)
   ▼
apps/boilerplate                                  ← shell app + wrappers convex
   │  clone / merge git (remote `template`)
   ▼
dépôt du client (1 par restaurant)                ← site.config.ts + site/ + env
```

> ⚠️ **Les clients ne clonent pas ce dossier, ils clonent le dépôt miroir**
> `be-in-digital/beyours-boilerplate`. Ici les dépendances moteur sont en
> `workspace:^` (on développe contre le moteur courant) ; là-bas elles sont en
> versions publiées. Tant qu'un job ne pousse pas ce dossier vers le miroir en
> réécrivant les versions, **les deux divergent**.

---

## En une minute

| | |
| --- | --- |
| **Ce que c'est** | Le livrable — 98 routes, 51 templates design, 50 démos commerciales |
| **Qui l'utilise** | Un restaurateur par clone, plus l'équipe qui crée les sites |
| **Ce qui vient du moteur** | 9 paquets `@be-in-digital/*` — logique, schéma Convex, UI, admin |
| **Ce qui est propre au gabarit** | La zone client, les templates, les scripts de création et de mise à jour, les démos |
| **Isolation des données** | 1 déploiement Convex par client — structurelle, pas applicative |

---

## Les démos : l'outil de vente

`demos/` contient **50 boutiques statiques navigables**, une par template, avec
carte, panier et paiement Stripe en mode test. Un prospect essaie le site avant
de l'acheter, sans qu'on provisionne quoi que ce soit.

```bash
# hors ligne, sans dépendances
open demos/index.html
```

![Catalogue des démos](../../docs/captures/demos-catalogue.png)

C'est du HTML/CSS/JS pur : pas de build, pas de serveur, pas de backend. Le
workflow `demos.yml` les valide (contraste AA, unicité des mises en page,
cohérence des prix) en quelques secondes.

Chaque démo couvre les deux faces du produit — la boutique que voit le client
final, et le back-office que voit le restaurateur :

![Storefront](../../docs/captures/demo-storefront.png)

![Back-office](../../docs/captures/demo-admin.png)

---

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

### La CLI `beyours` (recommandée)

Installation (une fois, `gh` authentifié) :

```bash
gh api repos/be-in-digital/beyours-boilerplate/contents/scripts/beyours \
  -H "Accept: application/vnd.github.raw" > /opt/homebrew/bin/beyours \
  && chmod +x /opt/homebrew/bin/beyours
beyours token ghp_xxx           # PAT read:packages, stocké chmod 600
```

> La CLI s'appelait `beindigital` avant août 2026. Une installation existante
> continue de fonctionner ; réinstaller sous le nouveau nom et supprimer
> l'ancien binaire.

Puis tout se fait au terminal :

```bash
beyours create client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
beyours create client-luigi --name "Chez Luigi" --mobile   # web + app
beyours create client-luigi --name "Chez Luigi" --template pizzeria   # design vertical
beyours help · version · upgrade
```

La CLI va chercher les scripts sur ce repo à chaque appel — elle profite des
mises à jour du template sans réinstallation. Équivalent sans CLI :

```bash
gh api repos/be-in-digital/beyours-boilerplate/contents/scripts/create-site.mjs \
  -H "Accept: application/vnd.github.raw" | node --input-type=module - \
  client-luigi --name "Chez Luigi" --repo be-in-digital/client-luigi
```

La commande enchaîne : clone du template → remote `template` (mises à jour) →
création du repo GitHub privé → `pnpm install` → configuration complète
(`site.config.ts`, secrets générés, `.env.local`, app mobile si demandée) →
commit initial → push. Depuis un clone existant : `pnpm create:site <dossier> [options]`.

### À la main (équivalent)

```bash
git clone https://github.com/be-in-digital/beyours-boilerplate.git client-luigi
cd client-luigi && git remote rename origin template
export NODE_AUTH_TOKEN=ghp_xxx
pnpm install
pnpm setup            # wizard : nom, description, locale, web / web + app, template design
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

### Templates design (5 verticaux prêts à l'emploi)

Un template pose l'identité complète (couleurs clair/sombre, polices, formes)
dans la zone client ; il reste ensuite à ajuster les couleurs à l'image du
client dans `site/theme.css` :

| Slug | Direction |
| --- | --- |
| `pizzeria` | Trattoria : terracotta du four à bois, didone italienne |
| `fast-food` | Smash : moutarde sur charbon, grotesque charnue |
| `food-truck` | Convoi : pétrole émaillé sur kraft, condensée stencil |
| `poulet` | Braise : rouge piment sur crème, condensée d'affiche |
| `asiatique` | Izakaya : jade et encre sur washi, gothique japonaise |

```bash
pnpm template:list             # catalogue
pnpm template:apply poulet     # applique (ou --template à la création)
```

Aperçu visuel : ouvrir `templates/preview.html`. Direction artistique
détaillée (palette, imagerie, ton, adaptation client) :
[`templates/README.md`](templates/README.md) et `templates/<slug>/DESIGN.md`.

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
git clone https://github.com/be-in-digital/beyours-engine ../beyours-engine
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
| `pnpm template:list` / `template:apply <slug>` | Templates design (5 verticaux + neutre) |
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

---

## Points de vigilance

**`update:template` ne vérifie pas le contrat de maintenance.** Le modèle
économique dit qu'un site expiré reste figé sur la dernière version couverte
(`packages/convex-functions/src/maintenance.ts`). En pratique,
`scripts/update-template.mjs` fait un `git fetch template` nu : un site expiré
qui lance la commande reçoit tout. La garde reste à écrire.

**La machinerie de miroir survit à sa raison d'être.**
`scripts/sync-from-engine.mjs` et `.github/workflows/sync-engine.yml`
resynchronisaient ce dossier depuis `apps/reference` quand les deux vivaient
dans des dépôts séparés. Depuis la fusion ils n'ont plus d'objet — ils sont
conservés tant que le job de publication vers le miroir de distribution n'existe
pas, parce qu'on ne retire pas un mécanisme avant d'avoir livré son remplaçant.

**Le `.github/` de ce dossier n'est pas inerte.** GitHub ne lit que le
`.github/` de la racine du dépôt, donc ces workflows ne s'exécutent pas ici —
mais ils font partie de la charge utile clonée, et s'exécutent bien dans le
dépôt du client. Ne pas les supprimer.

**Trois listes de templates coexistent** : 51 dossiers dans `templates/`, 50
démos dans `demos/`, 52 entrées dans `apps/site/lib/templates-data.ts`. Aucun
test ne les réconcilie.

---

## Pour reprendre cette app

1. Le [README de la racine](../../README.md) pour le contexte monorepo, puis
   celui-ci.
2. Ouvrir `demos/index.html` — c'est le produit, navigable sans rien installer.
3. [`docs/design/boilerplate-v2.md`](docs/design/boilerplate-v2.md) pour
   comprendre pourquoi deux canaux de mise à jour, puis
   [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md) pour la frontière entre zone
   client et zone moteur — c'est le contrat qui permet aux mises à jour de
   passer sans conflit.
4. `scripts/create-site.mjs` puis `scripts/init.mjs` : tout le parcours de
   création d'un site y tient.
5. `pnpm dev:boilerplate` depuis la racine, avec un `convex dev` dans un second
   terminal.
