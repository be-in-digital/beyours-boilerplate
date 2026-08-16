# Convoi — food truck street craft

Direction for a food truck or any nomadic concept: short menu, fresh produce,
service at the hatch. The register of the mobile craftsman who owns the road,
not the decorative "street food" of retail parks.

## Concept

The enamelled bodywork. A deep petrol blue, the one on trucks repainted by
hand, laid over a light kraft background, the one of wrapping paper and the
chalkboard of the day. The warm/cold contrast (kraft against petrol) is the
signature of this template: the other four verticals are single-temperature,
this one runs the pair in harness.

## Palette

| Token | Value (light) | Role |
| --- | --- | --- |
| `--primary` | `192 62% 27%` petrol blue | CTAs, prices, active navigation. The truck's enamel. |
| `--background` | `40 26% 96%` light kraft | General background, wrapping paper. |
| `--foreground` | `202 28% 13%` blued ink | Text, cold on a warm ground. |
| `--accent` | `192 38% 92%` | Badge backgrounds and hovers, diluted petrol. |
| `--secondary` / `--muted` | `40 18% 90-91%` | Secondary backgrounds on the kraft side. |

Dark mode: "night service". Very dark petrol ink, cards barely lighter, the
petrol lifts (`189 55% 47%`) like an LED sign on the truck, dark text on the
CTAs. The semantic tokens (statuses, success, warning) stay the engine's.

## Typography

- **Headings: Big Shoulders.** Industrial condensed, a tenth of an em of extra
  tracking (already in the theme): the truck's painted lettering. Weights
  600-800 on the large headings.
- **Body: Work Sans.** Robust neutral, built for small sizes: menus,
  allergens, location opening times.

## Shapes

Sharp corners (`--radius-*` scale tightened, 0.375rem base): toolbox, embossed
label, stencil. This is the most angular template in the catalogue — do not
soften individual cards case by case.

## Imagery (photos to upload in the CMS)

- **Hero**: the truck in a real situation (market, roadside, festival),
  natural light, customers queueing blurred in the background. Or the
  signature dish held in hand in front of the truck.
- **Products**: set on kraft paper or in the actual tray, shot from above
  (flat lay) with a natural shadow, same shooting height across the grid.
- **About**: the road, the inside of the truck mid-service, the board with
  the week's locations.
- Avoid: studio backdrops, sit-down restaurant tableware, anything that
  denies the concept's mobility.

## Editorial tone (CMS copy)

Spoken, precise, slightly telegraphic: chalkboard style ("Today: market
square, 11.30 - 2pm"). Locations and times are first-class content, not
footnotes.

## Adapting to the client

1. `--primary` + `--ring` + `--sidebar-primary`: the client's bodywork color
   (bottle-green enamel, fire-engine red, traffic orange). Keep lightness
   ≤ 32% in light mode for the light text on CTAs, or switch
   `--primary-foreground` to a dark value if the color is bright.
2. `--accent` / `--accent-foreground`: same hue, diluted for the background,
   darkened for the text.
3. The kraft background is half the identity: only replace it with a neutral
   white if the client already has a cold printed brand guide.
