# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any code. Heed deprecation
notices.

# Boilerplate BeInDigital — règles pour agents

Ce repo est le **template** des sites restaurant BeInDigital. Un site client
est un clone de ce repo. Le code produit vient de deux sources :

1. **Packages npm `@be-in-digital/*`** (GitHub Packages privé, publiés depuis
   [be-in-digital/beindigital-engine](https://github.com/be-in-digital/beindigital-engine)).
   `NODE_AUTH_TOKEN` (PAT `read:packages`) est requis pour `pnpm install`.
   Sans token : `pnpm engine:link <clone-engine>` (symlinks locaux).
2. **Le shell applicatif** (`app/`, `components/`, `lib/`, `hooks/`, `cms/`,
   `convex/`) : miroir de `apps/restaurant-theme` de l'engine.

## Zones de propriété — règle ABSOLUE

- **Zones ENGINE** (synchronisées depuis l'engine, ne pas éditer sur un site
  client) : `app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`,
  `public/` (fichiers d'origine), configs racine.
  Exceptions patchées par le boilerplate (marquées `PATCH BOILERPLATE` en
  tête de fichier) : `app/layout.tsx`, `next.config.ts`.
- **Zones CLIENT** (personnalisation par site, jamais écrasées) :
  `site.config.ts`, `site/` (theme.css, fonts.ts, components/), `.env*`,
  `.beindigital-site.json`, `mobile/` (app Expo autonome, config
  « web + app » — activée par `pnpm setup` ou `pnpm add:mobile` depuis le
  snapshot `.template/mobile/`).
- **Zone BOILERPLATE** : `templates/` (catalogue de designs verticaux :
  pizzeria, fast-food, food-truck, poulet, asiatique + default). Jamais
  touché par `sync:engine` ; `pnpm template:apply <slug>` copie theme.css +
  fonts.ts vers `site/`. Règles du catalogue (contraste AA, tokens
  sémantiques intouchés, contrat de variables engine) : `templates/README.md`.
  `demos/` (outil de vente) : 50 démos de sites complets multipage
  (5 catégories × 10 thèmes, moteur `assets/site.js` + identités
  `assets/themes.js`), multi-emplacements, réservation annulable, paiement
  Stripe **de test uniquement** (clé `sk_test_…` en env Vercel, jamais
  commitée). Contraste AA et unicité des mises en page vérifiés par script.
  Voir `demos/README.md`.

Une personnalisation impossible depuis la zone client = évolution à faire
dans l'engine, pas un patch local.

## Mises à jour (2 canaux)

- `pnpm update:engine` — bump des packages `@be-in-digital/*` (npm).
- `pnpm update:template` — merge git depuis le remote `template`
  (boilerplate). Voir `docs/UPDATES.md`.

## Commandes

`pnpm create:site <dossier>` (site complet one-shot) · `pnpm setup`
(wizard : web / web + app, template design) · `pnpm template:list|apply` ·
`pnpm add:mobile` · `pnpm env:setup|check|sync`
(les 3 fichiers .env : web/convex/mobile) · `pnpm dev` · `pnpm build` ·
`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm test:e2e` ·
`pnpm convex:dev` · `pnpm convex:deploy` · `pnpm convex:env`

## Convex

`convex/*.ts` sont des wrappers fins : ils re-exportent les définitions de
`@be-in-digital/convex-functions` (`export const list = query(defs.list)`).
Le schéma compose les tables de `@be-in-digital/convex-schema`. Ne pas écrire
de logique métier dans `convex/` — elle vit dans l'engine.
`convex/_generated/` est commité ; régénérer avec `pnpm convex:codegen`.
