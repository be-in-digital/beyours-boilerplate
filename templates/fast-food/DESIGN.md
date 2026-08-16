# Smash — premium burger

Direction for a new-generation burger joint: smash patties, house-baked buns,
fresh-cut fries. The register of the premium counter (Dumbo, Shake Shack), not
the red-and-yellow franchise.

## Concept

Mustard on charcoal, in two acts. By day the counter is charcoal and cream:
CTAs almost black, with the mustard living in the badges, the hovers and the
data (a mid yellow set as text on a light background never holds contrast, and
no serious execution tries). At night the ratio flips: the mustard becomes the
diner's neon and carries the CTAs, with dark text on top. No gradients, no
ketchup red as an accent — chromatic restraint is what makes it premium.

## Palette

| Token | Value (light) | Role |
| --- | --- | --- |
| `--primary` | `40 18% 11%` charcoal | Daytime CTAs and active navigation. |
| `--background` | `45 27% 97%` warm off-white | General background. |
| `--foreground` | `40 15% 9%` warm charcoal | Text, almost black. |
| `--accent` | `44 85% 90%` diluted mustard | Badge backgrounds, hovers: the daytime signature. |
| `--chart-1` | `42 92% 46%` mustard | First data series, and the selection color. |
| `--secondary` / `--muted` | `45 16% 92%` | Secondary backgrounds, filters, tags. |

Dark mode: deep charcoal (`40 12% 7%`), cards barely lighter, and `--primary`
switches to mustard (`42 96% 54%`, dark text on it, never white): the sign
lights up. The semantic tokens (statuses, success, warning) stay the engine's.

## Typography

- **Headings: Bricolage Grotesque.** Fleshy, a little cheeky, very current.
  Tracked in by -0.02em at display sizes (already in the theme). Large
  headings take 700-800 weights well.
- **Body: Archivo.** Utilitarian and dense, faultless on product cards,
  options and checkout.

## Shapes

Wide rounding (0.875rem base, buttons close to pill): the roundness of the
bun, the energy of the counter. Consistent everywhere, form fields included.

## Imagery (photos to upload in the CMS)

- **Hero**: burger in close-up, shot head-on, clean stack, plain charcoal or
  mustard background, hard and honest light (controlled flash, crisp shadows).
  The cheese pull and the crisp smash crust are the heroes.
- **Products**: plain dark or mustard background, the same angle across the
  whole grid (3/4, slightly from above), the product alone, no busy staging.
- **About**: the flat-top, the smash itself, the team behind the counter.
  A little grain is fine, real service energy matters more.
- Avoid: catalog shots on pure white, glossy "food styling" compositions with
  props, American flags.

## Editorial tone (CMS copy)

Short, direct, self-assured. Product names do the show ("The Double Smash"),
descriptions give the exact build of the burger. No gratuitous English beyond
proper nouns, no strings of exclamation marks.

## Adapting to the client

1. **Light signature** (yellow, orange, acid green): keep the two-act scheme
   exactly as it is. Put the client's color in `--accent`, `--chart-1` and the
   dark-mode `--primary` (dark text on it); the daytime CTAs stay charcoal.
2. **Dark signature** (burgundy, bottle green, midnight blue): it can take
   `--primary` + `--ring` + `--sidebar-primary` directly in both modes, with a
   light `--primary-foreground` and a verified 4.5:1 ratio.
3. `--accent` / `--accent-foreground`: always the same hue as the signature,
   diluted for the background, darkened for the text.
4. The charcoal neutrals work with any saturated signature: they are the
   backdrop, do not tint them toward the client's color.
