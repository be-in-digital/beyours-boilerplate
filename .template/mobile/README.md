# `mobile/` — app Expo (React Native)

App cliente compagnon du storefront web (commande / fidélité). Elle consomme
le **même backend Convex** que le web : l'URL est lue depuis
`EXPO_PUBLIC_CONVEX_URL` (fichier `mobile/.env`, rempli à l'activation depuis
votre `.env.local`).

## Statut

C'est un **point de départ** (zone client) : l'engine BeInDigital ne publie
pas encore de produit mobile. Le shell est volontairement minimal — un écran
placeholder, expo-router, TypeScript strict.

## Développement

```bash
cd mobile
pnpm install          # install indépendant (pas de workspace)
pnpm start            # Expo dev server (i = iOS, a = Android)
```

## Brancher le backend

- Convex : `ConvexProvider` + `ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL)`
  dans `app/_layout.tsx` (`convex/react` fonctionne en React Native).
  Les types `api` se génèrent côté racine (`pnpm convex:codegen`) et
  s'importent via un chemin relatif `../convex/_generated/api`.
- Auth : Better Auth en mode **bearer token** — ajouter `@better-auth/expo`
  (même version que `better-auth`) + `expo-secure-store`. Le web reste en
  cookies ; les deux partagent la même instance Better Auth (TTL access 1 h,
  refresh 30 j).

## Builds (EAS)

`eas.json` est créé à l'activation depuis `eas.json.template`.

```bash
eas init
eas secret:create --scope project --name NODE_AUTH_TOKEN --value <PAT read:packages>
eas build --profile production --platform ios|android
```

Icônes : ajouter `assets/icon.png` (1024×1024) et `assets/adaptive-icon.png`,
puis référencer dans `app.json` (`expo.icon`, `expo.android.adaptiveIcon`).
