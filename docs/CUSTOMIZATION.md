# Customizing a client site

## The zone contract

The repo is split into two zones. That split is what makes conflict-free
updates possible:

**CLIENT zone — yours, never overwritten:**

| Location | Contents |
| --- | --- |
| `site.config.ts` | Build-time identity: name, description, title template, default locale, allowed image hosts |
| `site/theme.css` | Design token overrides (loaded after `app/globals.css`) |
| `site/fonts.ts` | Fonts (`next/font`), exposed through `fontVariables` |
| `site/components/` | Components specific to this site |
| `public/` | Logos, favicon, static images (replace the files) |
| `.env.local`, `.env.convex` | Client secrets and endpoints (gitignored) |
| `.beindigital-site.json` | Init sentinel (site metadata) |
| `mobile/` | Expo app ("web + app" setup) — a client zone for as long as the engine ships no mobile product |

**ENGINE zone — synced, do not edit:**

`app/`, `components/`, `lib/`, `hooks/`, `cms/`, `convex/`, root configs
(`tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`,
`playwright.config.ts`, `vitest.config.ts`, `components.json`).

Two engine files carry a deliberate boilerplate patch (with a
`PATCH BOILERPLATE` header): `app/layout.tsx` (wires up the site zone) and
`next.config.ts` (transpilePackages + images from `site.config.ts`).

## Runtime customization (admin dashboard)

A large part of the customization does NOT go through code: the CMS and the
settings (`globalSettings`, languages, promotions, emails, and so on) live in
Convex and are edited from the `(admin)` dashboard. Rule of thumb: if the
restaurant owner has to be able to change it on their own, it belongs in the
dashboard; if it is set once when the site is created, it belongs in the
client zone.

## Recipes

**Start from a design template** — five ready-made vertical directions
(pizzeria, fast-food, food-truck, poulet, asiatique) lay down colors, fonts
and shapes in the client zone:

```bash
pnpm template:list             # catalogue (aperçu : templates/preview.html)
pnpm template:apply pizzeria   # écrase site/theme.css + site/fonts.ts
pnpm template:apply default    # restaure le thème d'origine
```

You can also pick one at creation time (`beindigital create … --template
pizzeria`, or the `pnpm setup` wizard question). After that, tune the client's
colors directly in `site/theme.css`, following the "Adapting to the client"
section of `templates/<slug>/DESIGN.md` (keep the AA contrast ratios).

**Change the colors** — `site/theme.css`:

```css
:root {
  --primary: 8 76% 45%;      /* HSL sans hsl() */
  --ring: 8 76% 45%;
}
.dark {
  --primary: 8 80% 55%;
}
```

**Change the fonts** — `site/fonts.ts`: swap Inter/Poppins for any
`next/font`, keeping the CSS variables `--font-inter` and `--font-poppins`
(they are referenced by the engine theme).

**Add a custom page** — create the route under `app/(storefront)/…`?
No: routes belong to the engine. Create the component in `site/components/`
and ask the engine for a slot or route if you need one. For a page that is
entirely outside the product (rich legal notices, an event landing page),
adding a NEW route file (one that does not exist in the engine) is tolerated:
a brand-new file cannot cause a merge conflict. Prefix it with a
`// SITE-SPECIFIC` comment and import the content from `site/components/`.

**Allow a new image CDN** — `site.config.ts` → `images.remoteHosts`.

## What NOT to do

- Modifying a component in `components/` "just for this client" → a silent
  fork: the next template update overwrites it or conflicts with it. If the
  need is legitimate, it goes up into the engine (feature flag, prop, slot)
  and comes back down through `pnpm update:engine`.
- Writing business logic in `convex/` (thin wrappers only).
- Committing `.env.local`, `.env.convex`, or a `package.json` in engine-link
  mode (`link:`) — CI blocks it.
