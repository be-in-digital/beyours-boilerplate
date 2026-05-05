# Restructuration en monorepo pnpm + Turborepo

> Statut : APPROVED par multi-agent review (2026-05-04)
> Phasage : 4 PRs sequentielles (PR1 squelette → PR2 Convex → PR3 web move → PR4 mobile)

## Contexte

Le boilerplate sert deux configurations :
- **web-only** : Next.js avec admin dashboard + storefront e-commerce
- **web+mobile** : Next.js + app Expo cliente finale (loyalty/commande)

Un seul template repo, le client choisit au clone via un script CLI qui purge le mobile si non desire.

## Decisions verrouillees (Understanding Lock)

1. Single template repo, CLI script post-clone purges mobile si non voulu
2. Backend (Convex) seul partage, UI 100% separee web vs mobile
3. Mobile = client final uniquement, pas d'admin sur mobile
4. Web admin + storefront dans la MEME app Next.js via route groups `(admin)/dashboard/*` et `(storefront)/*`
5. Storefront construit en composant `@be-in-digital/restaurant`
6. Mobile = juste structure + placeholder Expo maintenant, rempli plus tard
7. Convex a la racine, mais wrappe dans `packages/backend` pour les imports cross-workspace
8. pnpm workspaces + Turborepo des le depart
9. Auth : un seul Better Auth, role `admin|customer`, guest checkout supporte storefront
   - Web : cookies via proxy custom Next.js (existant)
   - Mobile : bearer tokens via `@better-auth/expo` + `expo-secure-store`
   - TTL access 1h / refresh 30d, rotation activee

## Structure cible

```
beindigital-boilerplate/
├── convex/                  # backend Convex (HTTP routes, schema, fonctions)
├── packages/
│   └── backend/             # workspace pkg, re-exporte convex/_generated/api comme @repo/backend
├── apps/
│   ├── web/                 # Next.js (admin + storefront route groups)
│   └── mobile/              # Expo placeholder, ou move dans .template/ si web-only
├── .template/
│   ├── mobile/              # snapshot dormant pour add-mobile.js
│   └── README.md            # explique le snapshot dormant
├── scripts/
│   ├── init.js              # post-clone CLI, idempotent (.beindigital-init.json sentinel)
│   ├── add-mobile.js        # checksum-aware, exit si mobile deja active
│   ├── bootstrap.js         # meta : init → env prompts → setup-convex-env
│   ├── setup-convex-env.sh  # existe deja
│   ├── check-node-auth-token.js  # preinstall guard
│   └── check-eas.js         # warn si EAS secret absent
├── eas.json.template
├── docs/design/             # ce fichier
├── turbo.json               # inputs scoped par task
├── pnpm-workspace.yaml
└── package.json             # hooks preinstall / predev / prebuild
```

## Decision Log (resume)

39 objections leves par les reviewers (Skeptic 13 + Constraint Guardian 13 + User Advocate 13). 4 BLOCKERs explicitement resolus :

| # | Source | Probleme | Resolution |
|---|---|---|---|
| 1 | Skeptic | Convex import paths cross-workspace | `packages/backend` re-exporte `_generated/api` comme `@repo/backend` |
| 2 | Skeptic | Better Auth proxy bypass mobile | Web garde cookies, mobile bearer via `@better-auth/expo` + `expo-secure-store` |
| 3 | Constraint | Bearer tokens TTL non bornes | Access 1h, refresh 30d avec rotation, revocation server-side |
| 4 | User Advocate | NODE_AUTH_TOKEN missing → erreur cryptique | Hook `preinstall` qui detecte et explique |

Autres resolutions cles :
- `init.js` est idempotent via sentinel `.beindigital-init.json` et auto-commit son changement
- Lockfile authoritative comme maximal set (web+mobile), web-only ignore les entrees mobile inutilisees
- CI : job web required, job mobile conditionnel sur `hashFiles('apps/mobile/package.json')`
- ESLint boundary rule entre route groups admin et storefront pour eviter bundle bloat
- Convex codegen : prebuild hook + `--check` en CI pour fail-fast

## Risques surveillances

1. **Convex `_generated` drift sur cold clone** : verifier ordre predev hook macOS+Linux avant fin PR2
2. **Mobile snapshot rot** : `.template/mobile/` se decale vs Expo SDK upgrades. Date check dans `add-mobile.js` qui warn si snapshot > 6 mois
3. **Better Auth dual-flow misconfig** : test integration cookies + bearer dans PR3 avant merge

## Plan d'implementation

### PR1 — Squelette monorepo (CE PR)
- `pnpm-workspace.yaml` etendu avec `apps/*` et `packages/*`
- `turbo.json` avec inputs scoped
- `package.json` racine avec `preinstall`, `predev`, `prebuild` hooks
- `scripts/check-node-auth-token.js`
- Aucun move de code, l'app actuelle continue de marcher a la racine

### PR2 — Extraction Convex + packages/backend
- Creer `packages/backend/` qui exporte `@repo/backend`
- Mettre a jour les imports Next.js pour utiliser `@repo/backend`
- Origin allowlist dans `convex/http.ts`
- TTL Better Auth dans `convex/auth.ts`

### PR3 — Move Next.js dans apps/web + auth hardening
- Deplacer `app/`, `components/`, `lib/`, `public/`, configs Next.js dans `apps/web/`
- Tester le route groups admin + storefront (storefront a peine commence)
- CI workflow mis a jour : job `web` + job `mobile` conditionnel
- Test integration auth dual-flow

### PR4 — Mobile placeholder + scripts + docs
- `apps/mobile/` Expo minimal (App.tsx Hello + auth-client basique)
- `.template/mobile/` snapshot copie de `apps/mobile/`
- `scripts/init.js`, `scripts/add-mobile.js`, `scripts/bootstrap.js`
- `eas.json.template`
- README canonique avec sections Quick start, Auth troubleshooting, Security, Operations
- Sub-READMEs stubs

Chaque PR doit shipper avec CI verte. PR2 et PR3 incluent un smoke test qui boote l'app et hit une query Convex.
