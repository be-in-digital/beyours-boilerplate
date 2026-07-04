# Personnalisation d'un site client

## Le contrat de zones

Le repo est découpé en deux zones. C'est ce qui rend les mises à jour
possibles sans conflit :

**Zone CLIENT — à vous, jamais écrasée :**

| Emplacement | Contenu |
| --- | --- |
| `site.config.ts` | Identité build-time : nom, description, template de titre, locale par défaut, hôtes d'images autorisés |
| `site/theme.css` | Surcharge des design tokens (chargé après `app/globals.css`) |
| `site/fonts.ts` | Polices (`next/font`), exposées via `fontVariables` |
| `site/components/` | Composants spécifiques au site |
| `public/` | Logos, favicon, images statiques (remplacer les fichiers) |
| `.env.local`, `.env.convex` | Secrets et endpoints du client (gitignorés) |
| `.beindigital-site.json` | Sentinel d'init (métadonnées du site) |
| `mobile/` | App Expo (config « web + app ») — zone client tant que l'engine ne publie pas de produit mobile |

**Zone ENGINE — synchronisée, ne pas éditer :**

`app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`, configs racine
(`tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`,
`playwright.config.ts`, `vitest.config.ts`, `components.json`).

Deux fichiers engine portent un patch boilerplate assumé (en-tête
`PATCH BOILERPLATE`) : `app/layout.tsx` (branche la zone site) et
`next.config.ts` (transpilePackages + images depuis `site.config.ts`).

## Personnalisation runtime (dashboard admin)

Une grande partie de la personnalisation ne passe PAS par le code : le CMS et
les réglages (`globalSettings`, langues, promotions, emails…) vivent dans
Convex et s'éditent depuis le dashboard `(admin)`. Réflexe : si le
restaurateur doit pouvoir le changer seul, c'est dans le dashboard ; si c'est
fixé une fois au setup du site, c'est dans la zone client.

## Recettes

**Changer les couleurs** — `site/theme.css` :

```css
:root {
  --primary: 8 76% 45%;      /* HSL sans hsl() */
  --ring: 8 76% 45%;
}
.dark {
  --primary: 8 80% 55%;
}
```

**Changer les polices** — `site/fonts.ts` : remplacer Inter/Poppins par
n'importe quel `next/font`, en conservant les variables CSS `--font-inter`
et `--font-poppins` (référencées par le thème engine).

**Ajouter une page custom** — créer la route dans `app/(storefront)/…` ?
Non : les routes appartiennent à l'engine. Créer le composant dans
`site/components/` et demander l'exposition d'un slot/route à l'engine si
nécessaire. Pour une page totalement hors produit (mentions légales riches,
landing événementielle), l'ajout d'un fichier route NOUVEAU (qui n'existe pas
dans l'engine) est toléré : un fichier nouveau ne peut pas entrer en conflit
de merge. Préfixez-le d'un commentaire `// SITE-SPECIFIC` et importez le
contenu depuis `site/components/`.

**Autoriser un nouveau CDN d'images** — `site.config.ts` →
`images.remoteHosts`.

## Ce qu'il ne faut PAS faire

- Modifier un composant dans `components/` « juste pour ce client » → fork
  silencieux : la prochaine mise à jour du template écrase ou entre en
  conflit. Si le besoin est légitime, il remonte dans l'engine (feature flag,
  prop, slot) et redescend par `pnpm update:engine`.
- Écrire de la logique métier dans `convex/` (wrappers fins uniquement).
- Committer `.env.local`, `.env.convex` ou un `package.json` en mode
  engine-link (`link:`) — le CI le bloque.
