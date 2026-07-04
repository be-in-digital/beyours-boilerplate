# Setup CI & secrets — runbook mainteneur

Tout ce qu'il faut configurer une fois sur le repo **boilerplate**, puis sur
chaque repo **site client**. Sans ces réglages, les workflows se dégradent
proprement (jobs sautés avec notice) mais ne rendent pas leur service.

## 1. Repo boilerplate

### Secrets (Settings → Secrets and variables → Actions → Secrets)

| Secret | Contenu | Utilisé par |
| --- | --- | --- |
| `GH_PACKAGES_TOKEN` | PAT `read:packages` limité à `@be-in-digital/*` | `ci.yml` (install) |
| `ENGINE_SYNC_KEY` **ou** `ENGINE_SYNC_TOKEN` | Clé privée SSH d'une deploy key read-only sur `beindigital-engine` (si l'org les autorise — désactivées à ce jour), **ou** PAT fine-grained `contents:read` sur `beindigital-engine` | `sync-engine.yml` (clone engine) |

Recette PAT `ENGINE_SYNC_TOKEN` : github.com/settings/personal-access-tokens/new
→ Resource owner `be-in-digital` → Only select repositories
`beindigital-engine` → Repository permissions : Contents **Read-only** →
expiration 90 j. Puis :
`gh secret set ENGINE_SYNC_TOKEN -R be-in-digital/beindigital-boilerplate --body "github_pat_…"`

### Première installation tokénée → committer le lockfile

Le template est livré **sans** `pnpm-lock.yaml` (impossible à générer sans
token registre). Dès que possible :

```bash
export NODE_AUTH_TOKEN=ghp_xxx
pnpm install
git add pnpm-lock.yaml && git commit -m "chore: lockfile registre" && git push
```

À partir de là le CI passe automatiquement en `--frozen-lockfile` et les
versions transitives sont figées (on a déjà subi une dérive : plugin eslint
plus récent que celui testé par l'engine — d'où l'override
`eslint-plugin-react-hooks` dans `package.json`, à réévaluer une fois le
lockfile en place).

### Branch protection `main`

Status check requis : `Lint + Test + Build`. Optionnel : `E2E tests
(Playwright)` une fois activés.

## 2. Repos sites clients

Mêmes réglages que le boilerplate, **sans** `ENGINE_SYNC_TOKEN` (les sites ne
se synchronisent pas sur l'engine — ils prennent les mises à jour du template
via `pnpm update:template`).

### E2E Playwright (optionnel, recommandé pré-prod)

1. Créer un deployment Convex **dédié aux tests** (jamais celui de prod) :
   `pnpx convex dev` dans un dossier jetable, ou un projet Convex séparé.
2. Variables (Settings → … → Variables) : `CONVEX_E2E_ENABLED=true`
3. Secrets : `E2E_NEXT_PUBLIC_CONVEX_URL`, `E2E_CONVEX_SITE_URL`,
   `E2E_BETTER_AUTH_SECRET` (openssl rand -base64 32)

Sans `CONVEX_E2E_ENABLED`, le job e2e est sauté. Avec des URLs placeholder,
seuls les tests « public » tournent (voir `playwright.config.ts`).

## 3. Vercel (par site)

- Env vars : les `[REQUIS]` de `.env.example` + `NODE_AUTH_TOKEN` (install).
- `pnpm convex:deploy` pour le backend prod, puis reporter
  `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_SITE_URL` de prod.

## 4. Routes de test en production

Les routes du groupe `app/(test)/` (harnais Playwright, ex. `/address-test`)
renvoient 404 en production via `app/(test)/layout.tsx` (garde boilerplate).
Pour les réactiver exceptionnellement : `NEXT_PUBLIC_ENABLE_TEST_ROUTES=true`.
