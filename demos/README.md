# Interactive demos — BeYours

**50 complete site demos**: 5 verticals (categories) × **10 themes each**, every
theme with its **own identity** (brand, light/dark palette, typefaces, shapes,
texture) and its **own layout** (hero type, menu presentation, navigation,
footer). A prospect opens the link, browses a **multipage site** (home, menu,
about, locations, reservation, contact), orders, and goes all the way to
**payment in Stripe test mode**.

Guarantees:

- **Every link works**: navigation, footer, phone (`tel:`), email (`mailto:`),
  Google Maps directions, validated forms. Zero `href="#"` (swept in a browser).
- **The reservation page links out, it does not book.** The product has no
  reservation feature: `stores.reservationUrl` points at the establishment's own
  tool (TheFork, Zenchef, Guestonline) and the button renders only when one is
  set. `reserve.html` says exactly that and offers the phone. It used to render
  a full booking form with always-free slots and a reference number, written to
  the visitor's `localStorage` — a feature the buyer would never have received.
- **Multi-location**: each theme has 1 to 3 places; the customer picks theirs
  (Locations page) and it follows the order through to checkout. Single-location
  themes show that case too.
- **10 genuinely different designs per category**: every theme in a category has
  a unique hero × menu combination (10 hero families, 8 menu families,
  4 navigations, 5 button languages, textures), verified by script. Contrast:
  400 AA pairs verified (50 themes × 2 modes).

```
demos/
  index.html            showroom: 5 categories × 10 themes
  home.html?t=<theme>   home              \
  menu.html             the menu           |
  about.html            about              |  site pages, rendered by the
  locations.html        addresses / places |  engine for the chosen theme
  reserve.html          reservation (link-out) |
  contact.html          contact            |
  checkout.html         payment (Stripe test card)
  success.html          confirmation      /
  pizzeria.html …       legacy URL redirects to theme 1
  assets/
    themes.js           50 identities + category packs (dishes, places, story)
    site.css            layout families (driven by data attributes)
    site.js             multipage engine: theme, cart, locations
    shots/              real screenshots of the 50 home pages (showroom gallery)
  api/checkout.js       serverless function: Stripe Checkout session (TEST)
  package.json          stripe dependency (installed by Vercel)
  vercel.json           clean links + noindex
```

Example identities within one category (pizzeria): Trattoria (editorial serif,
round photo), Vesuvio (brutal Anton poster, bento), Milano (Playfair magazine,
mosaic), Golfo (Mediterranean collage), Doppio Zero (Swiss minimal, ledger),
Notte (night dark, order bar)… None shares its layout with another in its
category.

**Adding an 11th theme**: one entry in `assets/themes.js` (light/dark palette,
font pair, hero/menu/nav/footer combination, copy) and it is live: the pages,
the cart and the locations all come from the engine. Dishes and
prices stay those of the category pack (aligned with `api/checkout.js`, the
authority on prices).

## Local preview (without Stripe)

Open `demos/index.html` in a browser. Everything is navigable; at payment time,
with no backend running locally, the demo **simulates** the payment and shows
the confirmation page. That is `?sim=1` mode.

## Deployment (Vercel) — real test payment

A real test payment (redirect to the Stripe page where the customer enters
`4242 4242 4242 4242`) needs the serverless function and **a Stripe test key**.
The key lives only in the Vercel environment variables, never in the repository.

1. **Vercel project** pointing at this folder:
   ```bash
   cd demos
   vercel        # (or: new Vercel project, Root Directory = demos/)
   ```
   Vercel detects the static files plus the `api/checkout.js` function and
   installs `stripe` on its own.

2. **Stripe test key** (Stripe Dashboard → Developers → API keys, in Test mode,
   `sk_test_…`) set as an environment variable:
   ```bash
   vercel env add STRIPE_SECRET_KEY   # paste the sk_test_… ; Production + Preview
   vercel --prod                      # redeploy to apply
   ```
   While the variable is missing, the API answers 501 and the demo falls back
   cleanly to the simulation — nothing breaks.

3. **A link per client**: the showroom `https://<project>.vercel.app/` (pick from
   the 50 themes), or a theme directly:
   `https://<project>.vercel.app/home?t=pizzeria-milano`. Legacy URLs
   (`/pizzeria`, `/poulet`…) redirect to the first theme of the category.

No **publishable** key is needed here: the function creates a hosted Stripe
Checkout session and returns its URL; the customer enters their test card on
Stripe's page, not on the demo.

## Stripe test card

Shown on the payment page, to hand to the prospect:

| Field | Value |
| --- | --- |
| Number | `4242 4242 4242 4242` |
| Expiry | any future date (e.g. 12/34) |
| CVC | any 3 digits |
| Postcode | 75000 |

Other scenarios (declined payment, 3D Secure…): see
[stripe.com/docs/testing](https://stripe.com/docs/testing). Always stay in
**Test mode**; these demos must never use an `sk_live_…` key.

## Tailoring a demo for a meeting

Everything is in `assets/themes.js`: the theme identity (brand, tagline,
palette, fonts, layout, number of locations, hero copy) and the category packs
(dishes, places with addresses/opening hours/phone numbers, story, contact). To
match a specific prospect: duplicate the closest theme, change
brand/colours/copy, and share `home.html?t=<their-theme>`. Keep the dish `id`s
aligned with `api/checkout.js` (the authority on prices at payment time).

## Analytics (opt-in, off by default)

The engine emits sales events (`demo_theme_viewed`, `add_to_cart`,
`begin_checkout`, `order_paid`) and page views, **if and
only if** a public PostHog key is supplied. No key is committed, and no network
call happens while it is absent. To enable, inject before `site.js`:

```html
<script>window.POSTHOG_KEY = "phc_your_public_key"; /* window.POSTHOG_HOST optional */</script>
```

(for example through a tag added to the shells, or a variable injected at
deployment). You then know which themes prospects look at and where they drop
off.

## Regenerating the showroom screenshots

The showroom (`index.html`) shows **real screenshots** of the 50 home pages
(`assets/shots/<themeId>.jpg`, clickable into a lightbox). After retouching a
theme, re-capture: serve `demos/` locally, open each `home.html?t=<themeId>` in
a headless browser at 1280×800, capture the view, then convert to a ~840 px JPEG
(e.g. `sips -s format jpeg -s formatOptions 74 --resampleWidth 840`). A single
theme can be recaptured on its own; there is no need to redo all 50.

## Relationship to the engine (important)

These demos show the target: a clean design per vertical, not one theme
recoloured. Two levels to keep apart on the production side:

1. **The engine storefront hard-codes its colours** (green + orange): even a
   tokenised template does not recolour the marketing pages yet. First engine
   job: replace the hard-coded colours with the tokens
   (`bg-primary`/`bg-background`…).
2. **A design per vertical** (these demos) assumes, eventually, that the engine
   can serve **different layouts** per vertical (not merely different tokens) —
   through component variants or per-theme layouts. These `<slug>.html` files are
   the reference for what each vertical has to render.
