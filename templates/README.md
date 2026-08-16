# Design templates — catalogue

**50 art directions** (10 per restaurant vertical) plus the engine neutral.
A template sets the complete visual identity of a site (light/dark colors,
admin sidebar, dashboard charts, fonts, shape language) inside the **client
zone**: pick the template when the site is created, then tune the colors to
the client's brand in `site/theme.css`.

The 5 flagship directions (one per vertical) are detailed below and maintained
by hand. The other 45 (`<category>-<theme>`, e.g. `pizzeria-milano`,
`asiatique-omakase`) are **generated from the demo identities**
(`node scripts/gen-templates.mjs`, source: `demos/assets/themes.js`): each
`template.json` points at the interactive preview `demos/home.html?t=<slug>`.
`pnpm template:list` lists them all.

| Slug | Direction | Signature | Headings / Body |
| --- | --- | --- | --- |
| `pizzeria` | Trattoria, neo-Neapolitan | Terracotta on warm stone | Libre Bodoni / Figtree |
| `fast-food` | Smash, premium burger | Mustard on charcoal (two acts) | Bricolage Grotesque / Archivo |
| `food-truck` | Convoi, street craft | Enamelled petrol on kraft | Big Shoulders / Work Sans |
| `poulet` | Braise, urban rotisserie | Chilli on cream | Barlow Condensed / Barlow |
| `asiatique` | Izakaya, contemporary | Jade and ink on washi | Zen Kaku Gothic New / Noto Sans |
| `default` | Engine neutral | Orange | Poppins / Inter |

Visual preview: open `templates/preview.html` in a browser.
The direction in detail (concept, imagery, tone, adapting to the client): each
template's `DESIGN.md`.

**Interactive demos** (`demos/`): every world has a browsable shop with a cart
and Stripe test payments — a prospect can try the real site before buying.
Open `demos/index.html` locally, or deploy on Vercel for real test payments.
See `demos/README.md`.

## Usage

```bash
# when creating a site
beindigital create client-luigi --name "Chez Luigi" --template pizzeria
pnpm setup                       # the wizard offers the template choice

# on an existing site
pnpm template:list               # catalogue
pnpm template:apply poulet       # applies (overwrites site/theme.css + site/fonts.ts)
pnpm template:apply default      # restores the original theme
```

Applying a template copies `templates/<slug>/theme.css` and `fonts.ts` into
`site/` (the client zone) and records the choice in `.beindigital-site.json`.
Nothing else is touched: same routes, same components, same engine updates.

## Anatomy of a template

```
templates/<slug>/
  template.json   # slug, label, description, signature, fonts (CLI catalogue)
  theme.css       # light/dark tokens + sidebar + radius scale + type details
  fonts.ts        # next/font pair (--font-inter / --font-poppins variables are mandatory)
  DESIGN.md       # art direction: concept, palette, imagery, tone, adapting
```

## Catalogue rules

- **AA contrast verified**: every palette passes WCAG AA (4.5:1) on the
  text/background pairs of both modes, CTAs and sidebar included. Any color
  tweak has to keep those ratios.
- **Semantic tokens untouched**: `--success`, `--warning`, `--info`,
  `--destructive` and `--status-*` stay the engine's. They carry functional
  meaning (kitchen, till, orders) and are not part of the identity.
- **Engine contract respected**: only the overrides `app/globals.css` provides
  for (HSL tokens, sidebar in full `hsl()`, font variables) plus Tailwind v4's
  `--radius-*` scale. No selectors that depend on the DOM of engine
  components.
- **Photos and copy come from the CMS**: a template ships no images. The
  imagery guidance in `DESIGN.md` steers what the client uploads in the admin
  dashboard.

## Adding a template

1. Copy an existing folder, rename the slug.
2. Design the palette (both modes + sidebar + charts), the font pair
   (`next/font/google`, keep the variable names) and the radius scale.
3. Check the AA contrast of the pairs listed above.
4. Document the direction in `DESIGN.md`, fill in `template.json`.
5. Add the matching block to `preview.html`.

This folder belongs to the boilerplate (never touched by `sync:engine`) and
reaches sites through `pnpm update:template`.
