# BeInDigital Boilerplate

Boilerplate restaurant SaaS BeInDigital. Monorepo `pnpm` + Turborepo qui sert
deux configurations au choix au moment du clone :
- **web-only** : Next.js avec admin dashboard + storefront e-commerce
- **web+mobile** : Next.js + app Expo cliente finale (loyalty/commande)

## Stack

- **Next.js 16.2** (App Router, Turbopack), **React 19**
- **Convex** comme backend partage (DB, fonctions, HTTP actions)
- **Better Auth** + `@convex-dev/better-auth`. Web: cookies via proxy custom Next.js. Mobile: bearer tokens via `@better-auth/expo` + `expo-secure-store`
- **Zustand** pour le state (jamais de React Context)
- **Tailwind CSS v4** cote web. Mobile: TBD au moment d'activer le mobile
- **Expo SDK 53** + **expo-router** + **EAS Build** pour iOS/Android
- Packages internes `@be-in-digital/*` (admin, ui, restaurant, themes, core, convex-functions, convex-schema)

## Structure

```
beindigital-boilerplate/
├── convex/                    # backend Convex (schema, fonctions, http)
├── packages/
│   └── backend/               # @repo/backend — re-exporte convex/_generated
├── apps/
│   ├── web/                   # Next.js (admin + storefront route groups)
│   └── mobile/                # Expo placeholder, archive si web-only
├── .template/mobile/          # snapshot dormant pour pnpm add-mobile
├── scripts/                   # init.js, add-mobile.js, setup-convex-env.sh, ...
├── docs/design/               # ADR / decisions (multi-agent reviews)
├── eas.json.template
├── turbo.json
├── pnpm-workspace.yaml
└── package.json               # orchestration (turbo run dev/build/...)
```

## Quick start (5 commandes)

```bash
gh repo create be-in-digital/client-pizza --private --template be-in-digital/beindigital-boilerplate
cd client-pizza
export NODE_AUTH_TOKEN=ghp_xxx       # PAT GitHub avec scope read:packages
pnpm setup                            # CLI : "Mobile? (y/N)"  + cree .beindigital-init.json
pnpm dev                              # demarre web (et mobile si actif)
```

## Setup detaille

### 1. Variables d'environnement

Le boilerplate a **deux scopes de variables** :
- **Cote Next.js** (`.env.local`) — utilise dans `apps/web/`
- **Cote Convex** (defini via `pnpx convex env set`) — utilise par les fonctions Convex

#### 1a. `.env.local`
```bash
cp .env.example .env.local
# Remplir les sections [REQUIS] :
#   - NEXT_PUBLIC_CONVEX_URL, CONVEX_DEPLOYMENT, CONVEX_SITE_URL
#   - BETTER_AUTH_URL (ex: http://localhost:3000)
#   - BETTER_AUTH_SECRET  (openssl rand -hex 32)
```

#### 1b. `.env.convex`
```bash
cp .env.convex.example .env.convex     # gitignore'd
# Remplir uniquement les vars dont les integrations sont actives
bash scripts/setup-convex-env.sh        # applique en bulk via convex env set
```

### 2. Provisionner Convex

```bash
pnpx convex dev    # cree le deployment client, met a jour .env.local
```

### 3. Lancer

```bash
pnpm dev           # turbo orchestre apps/web (et apps/mobile si actif)
```

## Auth troubleshooting

| Symptome | Plateforme | Cause probable | Fichier a verifier |
|---|---|---|---|
| 401 sur /api/auth/get-session | Web | Cookie domain mismatch | `apps/web/lib/auth-client.ts`, `convex/auth.ts` (trustedOrigins) |
| Token expire trop vite mobile | Mobile | TTL access token 1h (normal). Refresh devrait kick-in. | `convex/auth.ts` (TTL: 1h access, 30d session) |
| 500 sur /api/auth/convex/token | Web ou mobile | JWKS encrypte avec ancien BETTER_AUTH_SECRET | Run `pnpx convex run auth_admin:clearJwks` |
| Origin rejected sur HTTP action mobile | Mobile | SITE_URL absent ou \`*\` cote Convex | `pnpx convex env set SITE_URL <https-url-prod>` |
| Cookies ne se posent pas | Web | Proxy custom n'envoie pas le set-cookie | `apps/web/app/api/auth/[...all]/route.ts` |

## Securite (PCI SAQ-A)

- **Jamais de PAN (numero de carte) cote Convex ou Next.js server**. Stripe Elements obligatoire cote client + webhooks server-side uniquement
- **Better Auth secrets** : `BETTER_AUTH_SECRET` rotation 90 jours. Si vous changez, purger les JWKS : `pnpx convex run auth_admin:clearJwks`
- **NODE_AUTH_TOKEN** : fine-grained PAT `read:packages` scope `@be-in-digital/*` uniquement, rotation 90j. En CI : secret GitHub `GH_PACKAGES_TOKEN`. En EAS : `eas secret:create --scope project --name NODE_AUTH_TOKEN --value <token>`
- **CORS** : `convex/http.ts` valide l'`Origin` contre `process.env.SITE_URL`. Le helper `isAllowedOrigin` doit etre utilise sur toute custom HTTP action

## Operations

- **Capacite Convex** : 1 deployment par client. Plan dev gratuit suffit jusqu'a ~200 RPS storefront sustained. Au-dela, escalader le plan plutot que repenser l'archi
- **Limite mainteneur** : ~10 clients actifs par mainteneur — au-dela, investir dans du tooling (provisioning automatise Convex + Vercel)
- **Vercel cost guard** : storefront en ISR/static par defaut. Toute route en SSR dynamique requiert un commentaire de justification. Alarme budget Vercel a 80%
- **CI** : workflow GitHub Actions dans `.github/workflows/ci.yml`. Job `web` toujours required. Job `mobile` declenche uniquement si `apps/mobile/package.json` existe
- **Branch protection main** : status check requis = `Build web`. Si mobile actif, ajouter `Lint mobile` aux required checks

## Scripts pnpm

```bash
pnpm setup           # init.js — choix mobile y/N, cree .beindigital-init.json
pnpm add-mobile      # restaure apps/mobile depuis .template/mobile
pnpm dev             # turbo run dev (web + mobile si actif)
pnpm build           # turbo run build
pnpm lint            # turbo run lint
pnpm typecheck       # turbo run typecheck
pnpm convex:dev      # convex dev (provisionne / watcher)
pnpm convex:deploy   # convex deploy (production)
pnpm convex:codegen  # convex codegen (refresh des types)
```

## Deploiement

### Web (Vercel)
1. Importer le repo dans Vercel, root = repo root (pas `apps/web/`)
2. Build command : `pnpm --filter web build`
3. Output directory : `apps/web/.next`
4. Env vars : copier toutes celles de `.env.example` marquees `[REQUIS]`
5. Convex prod : `pnpm convex:deploy`, mettre a jour `NEXT_PUBLIC_CONVEX_URL` et `CONVEX_SITE_URL` en consequence

### Mobile (EAS Build)
1. `cp eas.json.template eas.json`
2. `eas init`
3. `eas secret:create --scope project --name NODE_AUTH_TOKEN --value ghp_xxx`
4. `eas build --profile production --platform ios|android`

## Design decisions

Le design du monorepo a ete valide par **multi-agent review** (Skeptic, Constraint
Guardian, User Advocate, Arbiter) — 39 objections traitees, 4 BLOCKERs resolus.
Voir [`docs/design/monorepo-restructure.md`](docs/design/monorepo-restructure.md).

## Notes importantes

- **Proxy auth Next.js custom** (`apps/web/app/api/auth/[...all]/route.ts`) : la lib upstream `convexBetterAuthNextJs` a des bugs avec Next.js 16. Ne pas la rebrancher tant que les bugs ne sont pas fixes upstream
- **Mobile snapshot rot** : `.template/mobile/` peut deriver des versions Expo SDK courantes. Le script `add-mobile.js` warn si le snapshot a > 6 mois
- **Expo + Convex** : `convex-react` fonctionne en RN. Utiliser `ConvexProvider` dans `apps/mobile/app/_layout.tsx` quand le placeholder est remplace par le vrai code
