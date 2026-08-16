# Braise — urban rotisserie (fried chicken)

Direction for a chicken fast food of the "Master Poulet" kind: crisp fried
chicken, house marinades, buckets to share. The register of the urban
rotisserie proud of its product, somewhere between the neighborhood poster and
the modern counter.

## Concept

Embers and cream. A deep chilli red, the color of the marinade and the grill,
laid over a warm cream background, the color of golden breading. The energy is
typographic: a poster condensed that climbs hard in weight, like rotisserie
signage. One signature color only, no chick yellow and no flame gradients.

## Palette

| Token | Value (light) | Role |
| --- | --- | --- |
| `--primary` | `355 70% 42%` chilli red | CTAs, prices, promotions. The marinade. |
| `--background` | `42 45% 97%` cream | General background, golden breading at its palest. |
| `--foreground` | `8 22% 11%` smoked black | Text, a black warmed toward the red. |
| `--accent` | `355 58% 95%` | Badge backgrounds and hovers, diluted chilli. |
| `--secondary` / `--muted` | `42 28% 92%` | Secondary backgrounds on the cream side. |

Dark mode: "the embers". Smoked black tinted red (`8 16% 7%`), the chilli
climbs to `50%` and keeps cream text: the contrast of a sign still lit late.
The semantic tokens (statuses, success, warning) stay the engine's; do not
confuse the signature red with the destructive red, that is the job of
`--destructive`, which stays distinct.

## Typography

- **Headings: Barlow Condensed.** Poster condensed, weights 600-800.
  A touch of tracking (already in the theme) to breathe at large sizes.
- **Body: Barlow.** The same drawing at normal width: the coherence of a
  single family, from hero to receipt. Legible and dense for long menus.

## Shapes

Contained rounding (0.5rem base): more forthright than a trattoria, less pill
than a burger. Poster spirit: the blocks stand square.

## Imagery (photos to upload in the CMS)

- **Hero**: the crisp chicken in extreme close-up, breading texture sharp,
  warm directional light, plain dark background. The shine of the sauce (hot
  honey, marinade) catches the light.
- **Products**: buckets and boxes shot at 3/4, plain cream or red background,
  sauces open alongside, same shooting distance across the grid.
- **About**: the grill and the fryer in action, marinades in jars, the team.
  Real steam and real flames, no added effects.
- Avoid: pale chicken, photos on clinical white, cartoon mascots, illustrated
  "flames" imagery.

## Editorial tone (CMS copy)

Proud and head-on: the product speaks ("Marinated 24 hours. Fried to order.").
Short sentences, concrete numbers (pieces, sauces, marinating time). Light
humor works in the menu names, never in the practical information.

## Adapting to the client

1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature.
   Stay at ≤ 45% lightness in light mode to hold AA with the cream text on
   the CTAs.
2. `--accent` / `--accent-foreground`: the same hue diluted for the
   background, darkened for the text.
3. The cream background can drift toward a more neutral white if the client's
   brand guide is cold; keep the smoked black text in that case so it does not
   tip into clinical.
