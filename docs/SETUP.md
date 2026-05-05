# Setup — Demarrer un nouveau projet client

Guide complet pour cloner le boilerplate BeInDigital et le mettre en route pour
un nouveau client. Compte ~30 minutes pour aller du clone au dev server qui
tourne en local, hors creation des comptes tiers (Stripe, AWS, etc.).

## Sommaire

1. [Prerequis](#1-prerequis)
2. [Creer le repo client](#2-creer-le-repo-client)
3. [Configurer NODE_AUTH_TOKEN](#3-configurer-node_auth_token)
4. [Premier install](#4-premier-install)
5. [Lancer pnpm setup](#5-lancer-pnpm-setup)
6. [Provisionner Convex](#6-provisionner-convex)
7. [Configurer les variables d'environnement](#7-configurer-les-variables-denvironnement)
8. [Lancer le dev server](#8-lancer-le-dev-server)
9. [Premier sign-up + dashboard](#9-premier-sign-up--dashboard)
10. [Setup mobile (si actif)](#10-setup-mobile-si-actif)
11. [Personnaliser pour le client](#11-personnaliser-pour-le-client)
12. [Deployer en production](#12-deployer-en-production)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequis

| Outil | Version | Verification |
|---|---|---|
| Node.js | 22+ | `node -v` |
| pnpm | 10+ | `pnpm -v` |
| git | 2.30+ | `git --version` |
| gh CLI | 2.40+ | `gh --version` |
| Compte GitHub | avec acces a `be-in-digital` org | `gh auth status` |
| Compte Convex | gratuit | https://convex.dev |

Si Expo activate (mobile) :

| Outil | Pour |
|---|---|
| `eas-cli` | Builds iOS/Android via EAS |
| Compte Expo | https://expo.dev |
| Compte Apple Developer | builds iOS production (99$/an) |
| Compte Google Play | builds Android production (25$ une fois) |

---

## 2. Creer le repo client

Le boilerplate est un **template GitHub**. Cloner via GitHub UI ou via gh CLI :

```bash
gh repo create be-in-digital/client-pizza-bobigny \
  --private \
  --template be-in-digital/beindigital-boilerplate \
  --clone

cd client-pizza-bobigny
```

Verifier que le repo est bien clone et qu'on est sur main :

```bash
git status
git log --oneline -3
```

---

## 3. Configurer NODE_AUTH_TOKEN

Le boilerplate consomme des packages prives publies sur GitHub Packages
(`@be-in-digital/admin`, `core`, `ui`, `restaurant`, etc.). `pnpm install`
echoue sans token avec une erreur **401 Unauthorized**.

### Generer le PAT

1. Aller sur https://github.com/settings/tokens (fine-grained)
2. **Note** : `beindigital-client-XXX-packages`
3. **Resource owner** : `be-in-digital`
4. **Repository access** : All repositories (ou seulement `beindigital-engine`)
5. **Permissions** : Account permissions → `Read access to packages`
6. Generer et **copier le token** (commence par `github_pat_...`)

### Exporter dans le shell

```bash
# Dans ~/.zshrc ou ~/.bashrc pour persister :
export NODE_AUTH_TOKEN=github_pat_XXXX

# Puis recharger :
source ~/.zshrc
```

Verification :

```bash
echo $NODE_AUTH_TOKEN | cut -c1-15
# github_pat_XXXX
```

---

## 4. Premier install

```bash
pnpm install
```

Le hook `preinstall` verifie d'abord la presence de `NODE_AUTH_TOKEN`. Si
manquant, un message colore explique comment le generer (voir etape 3).

L'install dure **2-5 minutes** (tres dependant du cache pnpm). Si vous voyez :

```
✕ unmet peer @hookform/resolvers@^3.0.0: found 5.2.2
```

Ignorer — c'est un mismatch connu sur `@be-in-digital/ui`, sans impact
fonctionnel.

---

## 5. Lancer pnpm setup

C'est l'etape qui choisit la configuration du projet :

```bash
pnpm setup
```

Le script demande :

```
Mobile app? Adds Expo, EAS Build, ~400MB deps.
Can be added later via `pnpm add-mobile`. (y/N)
```

- **N (defaut)** → archive `apps/mobile/` dans `.template/mobile/`, regenere
  le lockfile sans les deps Expo. Le repo devient **web-only**
- **y** → garde `apps/mobile/` en place, le repo devient **web+mobile**

Le script cree un fichier `.beindigital-init.json` qui memorise le choix :

```json
{
  "config": "web-only",
  "initializedAt": "2026-05-05"
}
```

Si vous le relancez par erreur, il refuse :

```
Already initialized as web-only on 2026-05-05.
To enable mobile later, run: pnpm add-mobile
```

> ⚠️ Apres `pnpm setup`, **commiter immediatement** le resultat avant tout
> autre changement, pour separer la config du template du code client :
> ```bash
> git add -A
> git commit -m "chore: initialize template (web-only)"
> ```

---

## 6. Provisionner Convex

Convex est le backend du boilerplate. Chaque client a son propre deployment.

```bash
pnpx convex dev
```

Premiere execution :

1. Le CLI ouvre le navigateur pour login Convex
2. Demande de creer un nouveau projet — choisir le nom du client
3. Le deployment est cree automatiquement, les credentials ecrits dans
   `.env.local` :
   ```
   CONVEX_DEPLOYMENT=dev:flying-eagle-123
   NEXT_PUBLIC_CONVEX_URL=https://flying-eagle-123.convex.cloud
   CONVEX_SITE_URL=https://flying-eagle-123.convex.site
   ```
4. Le watcher demarre — laisser tourner dans un terminal a part

> Garder ce terminal ouvert pendant le dev. Tout changement dans `convex/`
> est auto-deploye sur le deployment Convex en 1-3 secondes.

---

## 7. Configurer les variables d'environnement

Le boilerplate a **deux scopes de variables** :

| Scope | Fichier | Utilise par |
|---|---|---|
| Next.js | `.env.local` | `apps/web/` (serveur + client) |
| Convex | (defini via `convex env set`) | Fonctions Convex |

### 7a. Variables Next.js (`.env.local`)

```bash
cp .env.example .env.local
```

Remplir au minimum les sections marquees `[REQUIS]` :

```bash
# Convex (deja remplis par convex dev)
NEXT_PUBLIC_CONVEX_URL=https://flying-eagle-123.convex.cloud
CONVEX_DEPLOYMENT=dev:flying-eagle-123
CONVEX_SITE_URL=https://flying-eagle-123.convex.site

# Better Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<generer: openssl rand -hex 32>
```

Generer `BETTER_AUTH_SECRET` :

```bash
openssl rand -hex 32
# 7e8a3c... (64 caracteres hex)
```

### 7b. Variables Convex

```bash
cp .env.convex.example .env.convex
```

`.env.convex` est dans `.gitignore` — jamais commit. Editer pour remplir
**au minimum** les sections REQUIS et optionellement les integrations
(Stripe, Uber Eats, etc.) si activees pour le client :

```bash
# Required
BETTER_AUTH_SECRET=<meme valeur que .env.local>
BETTER_AUTH_URL=http://localhost:3000
SITE_URL=http://localhost:3000

# AWS S3 si uploads
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_NAME=client-pizza-bobigny-uploads

# Encryption pour paymentConnections (POS)
ENCRYPTION_KEY=<generer: openssl rand -hex 32>

# OpenAI pour traductions
OPENAI_API_KEY=sk-...

# ... voir .env.convex.example pour la liste complete
```

Appliquer en bulk :

```bash
bash scripts/setup-convex-env.sh
```

Le script lit `.env.convex` et appelle `convex env set` pour chaque ligne
non vide. Sortie attendue :

```
Lecture de .env.convex...
  -> set BETTER_AUTH_SECRET
  -> set BETTER_AUTH_URL
  -> set SITE_URL
  -> set AWS_REGION
  ...
12 variables definies cote Convex.
```

---

## 8. Lancer le dev server

Dans un nouveau terminal (Convex tourne deja dans un autre) :

```bash
pnpm dev
```

Ce qui se passe :
1. Le hook `predev` (`scripts/ensure-initialized.js`) verifie que
   `pnpm setup` a ete lance — sinon il bloque avec un message
2. Turborepo orchestre `pnpm --filter web dev` (et `mobile` si actif)
3. Pre-build : `convex codegen` regenere `convex/_generated/` (silencieux
   si CONVEX_DEPLOYMENT defini, skip si CI)
4. Next.js demarre sur http://localhost:3000

Sortie attendue :

```
   ▲ Next.js 16.2.2
   - Local:        http://localhost:3000
   - Environments: .env.local
   ✓ Ready in 1.2s
```

---

## 9. Premier sign-up + dashboard

1. Ouvrir http://localhost:3000/sign-up
2. Creer un compte avec un email + mot de passe (8 caracteres mini)
3. Vous etes redirige vers `/dashboard`
4. Le sidebar admin apparait avec les sections Orders, Products, Stores, etc.

> Par defaut, **tout nouvel utilisateur a le role `customer`**. Pour devenir
> admin, executer une mutation Convex one-shot :
> ```bash
> pnpx convex run userProfiles:setRoleByEmail \
>   '{"email":"votre@email.com","role":"admin"}'
> ```

---

## 10. Setup mobile (si actif)

Si vous avez choisi `y` a l'etape 5 ou si vous activez le mobile plus tard
via `pnpm add-mobile` :

### 10a. Configurer EAS

```bash
cp eas.json.template eas.json
pnpx eas-cli init  # cree le projet Expo et lie eas.json
```

### 10b. Definir le secret NODE_AUTH_TOKEN cote EAS

Sans ce secret, EAS Build echoue a installer les packages `@be-in-digital/*` :

```bash
pnpx eas-cli secret:create \
  --scope project \
  --name NODE_AUTH_TOKEN \
  --value $NODE_AUTH_TOKEN
```

### 10c. Demarrer le dev mobile

```bash
pnpm --filter mobile start
```

Scanner le QR code avec l'app Expo Go (iOS/Android) ou taper `i`/`a` pour
lancer le simulator/emulateur.

### 10d. Premier build cloud (preview)

```bash
pnpx eas-cli build --profile preview --platform ios
# ou --platform android
```

Le build se lance sur l'infra EAS, dure 15-30 minutes, et produit un IPA/APK
installable.

---

## 11. Personnaliser pour le client

### Branding

| Element | Fichier |
|---|---|
| Landing page (storefront) | `apps/web/app/page.tsx` |
| Logo + favicon | `apps/web/public/` |
| Couleurs / theme | `apps/web/app/globals.css` |
| Layout auth (sign-in/up) | `apps/web/app/(auth)/layout.tsx` |
| Layout admin sidebar | `apps/web/app/(admin)/layout.tsx` |
| Mobile splash + icone | `apps/mobile/app.json` + `apps/mobile/assets/` |

### Trusted origins (auth)

Dans `convex/auth.ts`, ajouter le domaine prod du client a la liste :

```ts
trustedOrigins: process.env.SITE_URL
  ? [process.env.SITE_URL, "http://localhost:3000"]
  : ["http://localhost:3000"],
```

Et cote Convex :

```bash
pnpx convex env set SITE_URL https://www.client-pizza.fr
```

### Pages admin

Les pages dans `apps/web/app/(admin)/dashboard/*` sont assemblees a partir
de `@be-in-digital/admin`. La majorite des reglages se font via le dashboard
lui-meme une fois logge en admin (settings, design, languages, etc.).

### Storefront

Les routes storefront vont dans `apps/web/app/(storefront)/*`. Composer a
partir des hooks/services exposes par `@be-in-digital/restaurant` :

```ts
import { useCart, useMenu, useCheckout } from "@be-in-digital/restaurant"
```

---

## 12. Deployer en production

### 12a. Convex prod

```bash
pnpx convex deploy
```

Cree un deployment de prod (URL diffferente du dev). Recopier les vars Convex
du dev vers le prod (avec valeurs prod) :

```bash
pnpx convex env set BETTER_AUTH_SECRET <NOUVEAU_secret_prod>
pnpx convex env set BETTER_AUTH_URL https://www.client-pizza.fr
pnpx convex env set SITE_URL https://www.client-pizza.fr
# ... etc, voir scripts/setup-convex-env.sh
```

### 12b. Web sur Vercel

1. Aller sur https://vercel.com/new
2. Importer le repo client (autoriser l'acces a `be-in-digital`)
3. **Root directory** : repo root (pas `apps/web/`, le monorepo le gere)
4. **Build command** : `pnpm --filter web build`
5. **Output directory** : `apps/web/.next` (auto-detecte)
6. **Install command** : `pnpm install --frozen-lockfile`
7. **Environment variables** :
   - `NODE_AUTH_TOKEN` (Build & Production) = PAT GitHub
   - Toutes les vars de `.env.local` `[REQUIS]`
   - `NEXT_PUBLIC_CONVEX_URL` = URL du deployment **prod** Convex
   - `CONVEX_SITE_URL` = `.convex.site` du prod
8. Deploy. Le premier build dure ~2 minutes.

### 12c. Mobile via EAS Build

```bash
pnpx eas-cli build --profile production --platform ios
pnpx eas-cli submit --platform ios
```

Idem pour Android. Le `--profile production` lit la section `production`
de `eas.json` qui inclut `EXPO_PUBLIC_CONVEX_URL` pointant vers le prod.

---

## 13. Troubleshooting

### `pnpm install` fait `401 Unauthorized`

`NODE_AUTH_TOKEN` absent ou invalide. Voir [etape 3](#3-configurer-node_auth_token).
Le hook preinstall devrait l'avoir intercepte avec un message clair —
si vous voyez juste 401, verifier que `package.json` contient bien le
hook `preinstall`.

### `pnpm dev` echoue avec "Project not initialized"

`pnpm setup` n'a pas ete lance. Voir [etape 5](#5-lancer-pnpm-setup).

Pour bypasser (CI uniquement) : `CI=1 pnpm dev`.

### `convex codegen` echoue avec "InvalidDeploymentName"

Votre shell a une variable `CONVEX_DEPLOYMENT` polluee (ex: copiee depuis
le commentaire de `.env.local`). Reset :

```bash
unset CONVEX_DEPLOYMENT CONVEX_URL CONVEX_SITE_URL
```

`.env.local` sera lue par convex CLI directement.

### 500 sur `/api/auth/convex/token`

JWKS encryptes avec un ancien `BETTER_AUTH_SECRET`. Purger :

```bash
pnpx convex run auth_admin:clearJwks
```

Better Auth les regenere automatiquement.

### Sign-up retourne 403 / Origin rejected

`SITE_URL` n'est pas configure cote Convex. Verifier :

```bash
pnpx convex env list | grep SITE_URL
```

Si absent :

```bash
pnpx convex env set SITE_URL http://localhost:3000  # dev
pnpx convex env set SITE_URL https://www.client.fr  # prod
```

### Mobile EAS Build echoue sur `pnpm install`

`NODE_AUTH_TOKEN` n'est pas configure cote EAS. Voir
[etape 10b](#10b-definir-le-secret-node_auth_token-cote-eas).

Verifier les secrets actuels :

```bash
pnpx eas-cli secret:list
```

### Build Vercel echoue avec "Cannot find module @repo/backend"

Le build Vercel ne trouve pas le workspace package. Verifier :
- **Root directory** = repo root, pas `apps/web/`
- **Install command** = `pnpm install --frozen-lockfile`
- `transpilePackages` dans `apps/web/next.config.ts` inclut bien `@repo/backend`

### Storefront slow / Vercel cost spike

Voir la section Operations du [README](../README.md#operations). Defaut :
storefront en ISR/static, ne passer en SSR dynamique qu'avec justification
commentee dans le code.

---

## Checklist de validation finale

Avant de declarer le projet client "pret pour developpement" :

- [ ] `pnpm install` OK (token configure)
- [ ] `pnpm setup` execute, `.beindigital-init.json` commit
- [ ] `pnpx convex dev` provisionne, `.env.local` rempli
- [ ] `BETTER_AUTH_SECRET` defini dans `.env.local` ET cote Convex (meme valeur)
- [ ] `pnpm dev` demarre sans erreur
- [ ] Sign-up + redirect dashboard fonctionnent
- [ ] Le compte test est promu en role `admin`
- [ ] (Si mobile) `pnpm --filter mobile start` lance Expo Go correctement
- [ ] Branche `main` du repo client poussee, CI verte
- [ ] Vercel project cree et build prod OK
- [ ] (Si mobile) EAS project cree et build preview OK

---

Pour toute reference au design du monorepo et aux trade-offs, voir
[`docs/design/monorepo-restructure.md`](design/monorepo-restructure.md).
