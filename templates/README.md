# Design templates — catalogue

**50 art directions** (10 per restaurant vertical) plus the engine neutral.
A template sets the complete visual identity of a site (light/dark colors,
admin sidebar, dashboard charts, fonts, shape language) inside the **client
zone**: pick the template when the site is created, then tune the colors to
the client's brand in `site/theme.css`.

Three files are copied into `site/` when a template is applied, and all three
are **overwritten**: `theme.css` (the palette), `fonts.ts` (the type) and
`layout.ts` (the layout).

## The layout half, and how much of it is built

`layout.ts` carries the seven families the demo engine defines
(`demos/assets/site.css` states the contract in its own header, and
`lib/layout-families.ts` is the engine's copy of it). They are generated from
the same demo identity as the palette, so what a buyer was shown and what the
site installs come from one source.

**Four of the seven change what a diner sees today.** The other three are carried,
typed, and refused when the value is not one the family admits — and paint
nothing yet. This table is what the product currently keeps, not what the demos
promise; `HONOURED_FAMILIES` in `lib/layout-families.ts` is the same list in
code, and a test holds the two against the stylesheet in both directions.

| Family | Values | Built? |
| --- | --- | --- |
| `tex` | `none` · `dots` · `lines` · `grain` · `checker` | **yes** — a texture under the shop, in the establishment's own ink |
| `up` | `0` · `1` | **yes** — headings in capitals |
| `foot` | `columns` · `center` · `heavy` | **yes** — `columns` is the default the component already renders; `center` stacks and centres it, `heavy` states a top edge and enlarges the name |
| `nav` | `left` · `center` · `bar` · `minimal` | **yes** — `left` is what the bar already does; `center` puts the name on the bar's centre line (desktop only, since below `md` the links give way to a hamburger); `bar` states a bottom edge; `minimal` drops the edge and steps the links back |
| `hero` | `split` · `editorial` · `fullbleed` · `poster` · `board` · `magazine` · `zen` · `banner` · `collage` · `duo` | not yet |
| `menu` | `cards` · `dotted` · `tickets` · `zen` · `mosaic` · `ledger` · `tabs` · `bento` | not yet |
| `btn` | `soft` · `pill` · `square` · `brutal` · `underline` | not yet, and **blocked**: three of the five are radius languages, and `--radius` reaches nothing on the shop. Measured 14 Sep 2026 — 405 hard-coded `rounded-*` literals across 44 storefront files, and `@theme inline` maps no `--radius-*` token, so no Tailwind utility resolves to it. Its only readers anywhere are the demos and `packages/ui`'s `InputGroup` |

Implementing one is a rule in `app/globals.css` plus its name in
`HONOURED_FAMILIES`; the row above flips on the same commit, because the test
fails either half alone. Every such rule **must** be confined to
`.storefront-theme`: the attributes sit on `<html>`, which is the dashboard's
ancestor too, and a selector that forgets repaints the owner's screens — the
mistake #410 and #41 each cost once already.

**How a family is reviewed.** These are CSS, and the question that decides whether
a rule is right — does this lay out the way it is meant to — cannot be answered by
any test here: jsdom parses CSS and does not lay it out. `scripts/layout-harness.mjs`
renders the real components to static pages with `app/globals.css` compiled as Next
compiles it, one page per family value, for review in a browser at two viewports. It
is how `bar` was caught forcing an opaque ground under text the component still
painted white for a photograph.

The demo previews (`demos/home.html?t=<slug>`) render all seven. A template's
`DESIGN.md` names its hero and menu family in prose, and has always said that
the demo's multi-page layout is what the engine side aims at. It still is, for
five of the seven.

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

- **AA contrast verified**: every palette passes WCAG 2.1 AA — 4.5:1 on the
  text/background pairs of both modes, and 3:1 on the controls WCAG 1.4.11 asks
  it of (`--primary`, `--ring`, `--input`, `--accent-solid`, `--destructive`
  against the page). Any color tweak has to keep those ratios.

  This sentence stood here for months with **nothing measuring it**, and it was
  false the whole time: swept for the first time on 9 September 2026, 50 of the
  51 palettes carried at least one failing pair. The dominant one was a single
  mistake copied 50 times — `--input` set to the same value as `--border`,
  which is exactly the defect `app/globals.css:126-135` had already found and
  fixed for the engine. `--input` is the boundary of every form field, so every
  delivered site had form fields whose edge was not there: 1.09:1 against a 3:1
  requirement, at the worst.

  What measures it is `tests/a11y/template-contrast.test.ts`, which loads each
  template over `app/globals.css` in the real cascade and checks all 51 in the
  four scopes a site renders under. Run it with
  `pnpm --filter @beyours/themes test`. Do not restore an unmeasured claim
  here: if that guard is ever removed, delete this sentence with it.

  **And read the first sentence of this bullet as what it is.** "Every palette
  passes WCAG 2.1 AA" is still wider than what is measured. The guard checks a
  FIXED MATRIX OF TOKEN PAIRS — the label-on-fill list, the semantic inks over
  the three surfaces, and the five non-text tokens — in four scopes. It does
  not sweep the markup per template, so a pair a template's own palette
  produces in a class combination outside that matrix is not measured, and is
  not covered by the sentence above. The guard's own docblock says so; this
  bullet used to imply otherwise.

  That gap was a cost decision, and it has become cheaper: `scanContrast` now
  takes the `overlays` argument `loadTokens` always had, so the markup sweep
  can be run per template rather than only against the engine palette. What it
  would cost is CI time — re-parsing every `.tsx` once per template — and what
  it would find is unknown until somebody runs it. Nobody has.
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
3. Run `pnpm --filter @beyours/themes test tests/a11y/template-contrast.test.ts`.
   It measures the new palette in the real cascade and prints every failing
   pair with its ratio; a template that does not clear it is not shippable.
   Move the ink or the control, never the background — hue and saturation are
   the identity, lightness is what clears the bar.
4. Document the direction in `DESIGN.md`, fill in `template.json`.
5. Add the matching block to `preview.html`.

This folder belongs to the boilerplate (never touched by `sync:engine`) and
reaches sites through `pnpm update:template`.
