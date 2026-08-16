# `mobile/` — Expo app (React Native)

Customer companion app to the web storefront (ordering / loyalty). It talks to
the **same Convex backend** as the web app: the URL is read from
`EXPO_PUBLIC_CONVEX_URL` (`mobile/.env`, filled in at activation time from
your `.env.local`).

## Status

This is a **starting point** (client zone): the BeYours engine does not ship a
mobile product yet. The shell is deliberately minimal — one placeholder
screen, expo-router, TypeScript strict.

## Development

```bash
cd mobile
pnpm install          # install indépendant (pas de workspace)
pnpm start            # Expo dev server (i = iOS, a = Android)
```

## Wiring up the backend

- Convex: `ConvexProvider` + `ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL)`
  in `app/_layout.tsx` (`convex/react` works under React Native).
  The `api` types are generated at the root (`pnpm convex:codegen`) and
  imported through the relative path `../convex/_generated/api`.
- Auth: Better Auth in **bearer token** mode — add `@better-auth/expo`
  (same version as `better-auth`) plus `expo-secure-store`. The web app stays
  on cookies; both share the same Better Auth instance (access TTL 1 h,
  refresh 30 d).

## Builds (EAS)

`eas.json` is created at activation time from `eas.json.template`.

```bash
eas init
eas secret:create --scope project --name NODE_AUTH_TOKEN --value <PAT read:packages>
eas build --profile production --platform ios|android
```

Icons: add `assets/icon.png` (1024×1024) and `assets/adaptive-icon.png`, then
reference them in `app.json` (`expo.icon`, `expo.android.adaptiveIcon`).
