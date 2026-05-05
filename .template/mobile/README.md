# `apps/mobile`

Expo (React Native) app — customer-facing companion to the BeInDigital web
storefront. Consumes the same Convex backend via `@repo/backend`.

See the root [README](../../README.md) for setup. Mobile-specific quirks:

- Auth uses bearer tokens via `@better-auth/expo` + `expo-secure-store`
  (the web flow uses cookies — both share the same Better Auth instance)
- Builds run on EAS Build. See `eas.json` (created by `pnpm bootstrap`)
- Set `NODE_AUTH_TOKEN` as an EAS secret for `@be-in-digital/*` private packages:
  `eas secret:create --scope project --name NODE_AUTH_TOKEN --value <PAT>`
