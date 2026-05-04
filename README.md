# BeInDigital Boilerplate

Boilerplate de demarrage pour les projets restaurant clients de **BeInDigital**.
Stack : Next.js 16 (App Router, Turbopack) + Convex + Better Auth + packages `@be-in-digital/*`.

## Stack

- **Next.js 16.2** avec App Router et Turbopack
- **React 19**
- **Convex** comme backend (DB, fonctions, HTTP actions)
- **Better Auth** + `@convex-dev/better-auth` pour l'authentification
- **Zustand** pour le state management (pas de React Context)
- **Tailwind CSS v4**
- Packages internes `@be-in-digital/admin`, `@be-in-digital/ui`, `@be-in-digital/convex-functions`, etc.

## Demarrer un nouveau projet client

### 1. Cloner et installer

```bash
git clone https://github.com/be-in-digital/beindigital-boilerplate.git mon-client
cd mon-client
rm -rf .git && git init
```

Le projet utilise des packages prives publies sur GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans votre environnement (token PAT GitHub avec scope `read:packages`) puis :

```bash
pnpm install
```

### 2. Creer un deploiement Convex

```bash
pnpx convex dev
```

Suivre les instructions pour creer un nouveau deployment. Les credentials seront ajoutes a `.env.local` automatiquement.

### 3. Configurer les variables d'environnement

Copier `.env.example` vers `.env.local` et remplir les valeurs requises :

```bash
cp .env.example .env.local
```

Variables minimales pour demarrer :
- `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `CONVEX_SITE_URL` (rempli par `convex dev`)
- `BETTER_AUTH_URL` (ex: `http://localhost:3000`)
- `BETTER_AUTH_SECRET` (generer avec `openssl rand -hex 32`)

Cote Convex, definir aussi les memes secrets :

```bash
pnpx convex env set BETTER_AUTH_SECRET <votre-secret>
pnpx convex env set BETTER_AUTH_URL http://localhost:3000
pnpx convex env set SITE_URL http://localhost:3000
```

### 4. Lancer le dev server

```bash
pnpm dev
```

L'app est disponible sur [http://localhost:3000](http://localhost:3000). La page sign-up cree un compte qui donne acces direct au dashboard (verification email desactivee par defaut).

## Structure

```
app/
  (admin)/dashboard/      Pages admin protegees par AuthGuard (29 routes)
  (auth)/                 sign-in, sign-up, forgot-password, reset-password
  api/auth/[...all]/      Proxy custom vers Convex pour Better Auth
convex/                   Schema, fonctions wrappees du package convex-functions, http routes
components/               AdminAuthSync, AdminApiInit, EnvCheck dialog
lib/                      auth-client, env-config, rbac, helpers Convex
```

## Routes

### Auth (publiques)
- `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`

### Admin (protegees, prefixees `/dashboard`)
- `/dashboard` (vue d'ensemble)
- `/dashboard/orders`, `/orders/[id]`, `/orders/kitchen`
- `/dashboard/products`, `/products/new`, `/products/[id]`, `/products/from-image`
- `/dashboard/inventory`, `/categories`, `/promotions`, `/games`
- `/dashboard/email`, `/email/campaigns`, `/templates`, `/subscribers`, `/segments`, `/config`
- `/dashboard/stores`, `/stores/[id]`, `/team`, `/languages`
- `/dashboard/design`, `/payments`, `/settings`, `/system`

## Scripts

```bash
pnpm dev        # Dev server (Turbopack)
pnpm build      # Build production
pnpm lint       # ESLint
pnpx convex dev # Watcher Convex (a lancer en parallele de pnpm dev)
```

## Deploiement

Voir le workflow `.github/workflows/ci.yml` qui lance lint + build sur chaque PR.

Pour deployer sur Vercel :
1. Importer le repo dans Vercel
2. Definir toutes les variables de `.env.example` dans les settings du projet
3. Pour Convex : utiliser un deploiement de prod (`pnpx convex deploy`) et mettre a jour `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SITE_URL` en consequence

## Notes importantes

- **Proxy auth custom** (`app/api/auth/[...all]/route.ts`) : la lib `convexBetterAuthNextJs` du package `@convex-dev/better-auth` a des incompatibilites avec Next.js 16 (cloning de body, header Origin manquant, set-cookie strippes). Le proxy custom resout ces problemes — ne pas le remplacer par la lib tant que ces bugs upstream ne sont pas fixes.
- **Validation env** : `components/env-check-dialog.tsx` affiche un panneau d'aide en dev si des variables d'environnement manquent.
- **Rotation des JWKS Better Auth** : si vous changez `BETTER_AUTH_SECRET`, executer `pnpx convex run auth_admin:clearJwks` pour purger les anciennes cles encryptees.
