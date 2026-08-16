# Trattoria — Neapolitan pizzeria

Direction for a premium artisan pizzeria: wood-fired oven, matured dough,
DOP ingredients. The neo-trattoria register (generous, Italian, well kept),
not the delivery-chain one.

## Concept

The oven is the center of everything. The palette starts from the real
materials of a Neapolitan pizzeria: terracotta from the ovens, pale stone from
the worktops, embers in the evening. It is an openly warm direction because
that is the authentic color code of this vertical, not a "premium beige"
default.

## Palette

| Token | Value (light) | Role |
| --- | --- | --- |
| `--primary` | `14 68% 44%` terracotta | CTAs, prices, strong links. The color of the oven. |
| `--background` | `28 33% 97%` warm stone | General background, never pure white. |
| `--foreground` | `18 38% 12%` deep brown | Text. A warm black, not a blue one. |
| `--accent` | `14 58% 95%` | Badge backgrounds, hovers, highlighted areas. |
| `--secondary` / `--muted` | `28 26% 92-93%` | Secondary backgrounds, tags, filters. |

Dark mode is "the oven at night": very dark burnt brown (no neutral gray),
terracotta lifted to ember (`15 74% 58%`) with dark text on the CTAs. The
semantic tokens (order statuses, success, warning) stay the engine's: they
carry functional meaning in the kitchen and at the till.

## Typography

- **Headings: Libre Bodoni.** Italian didone, strong editorial personality,
  high contrast. Tracked in by -0.015em at display sizes (already in the theme).
- **Body: Figtree.** Round and clear, it lets the didone carry the character.
  Never set the didone at small utilitarian sizes.

## Shapes

Generous rounding (`--radius-*` widened, 0.75rem base): cards and buttons feel
convivial, close to the plate and the tablecloth, without tipping into bubbly.

## Imagery (photos to upload in the CMS)

- **Hero**: a whole pizza straight out of the oven, tight 3/4 framing, warm
  directional light (end of day), dark background or wooden table. Steam and
  leopard spotting visible: the proof of the wood-fired oven.
- **Products**: plain warm stone or wood background, soft shadows, a cut slice
  or a signature ingredient in view (burrata, basil). Consistent lighting
  across the whole grid.
- **About**: the pizzaiolo at the oven, flour in the air, hands in the dough.
  Reportage, not a stock library.
- Avoid: flat flash-lit photos, generic stock with Italian flags, the clichéd
  close-up of stretching mozzarella.

## Editorial tone (CMS copy)

Direct and appetizing, product vocabulary (48-hour maturation, San Marzano,
fior di latte). Short sentences. No empty superlatives ("the best in town") —
craft precision is what makes it premium.

## Adapting to the client

1. `--primary` + `--ring` (and `--sidebar-primary`): the client's signature
   color, keeping lightness ≤ 48% in light mode so it holds AA contrast with
   the white text on buttons.
2. `--accent` / `--accent-foreground`: work the same hue (low saturation for
   the background, darkened for the text).
3. The neutrals (`--background`, `--border`, `--muted`) can stay as they are:
   they are drawn to carry any warm signature. For a client with a cold
   identity, start from the `asiatique` or `food-truck` template instead and
   keep these neutrals for the warm verticals.
