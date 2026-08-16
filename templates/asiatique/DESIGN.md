# Izakaya — contemporary Asian

Direction for a contemporary Asian restaurant: izakaya, ramen-ya, Korean
counter or neighborhood pan-Asian. The register of calm precision, not the
lanterns-and-dragons folklore.

## Concept

Ink and jade on paper. A washi background (Japanese paper, warm and matte),
sumi ink text with a slight blue cast, and a single color: a deep jade, the
one of ceramic and tea. Vermilion red, the expected code of the vertical, is
deliberately kept for the charts and secondary touches: restraint is what
separates a premium izakaya from a buffet.

## Palette

| Token | Value (light) | Role |
| --- | --- | --- |
| `--primary` | `168 46% 27%` deep jade | CTAs, prices, active navigation. Ceramic and tea. |
| `--background` | `46 25% 97%` washi | General background, warm matte paper. |
| `--foreground` | `210 14% 11%` sumi ink | Text, the blued black of ink. |
| `--accent` | `168 30% 92%` | Badge backgrounds and hovers, diluted jade. |
| `--secondary` / `--muted` | `46 14% 92%` | Secondary backgrounds on the paper side. |
| `--chart-2` | `8 72% 52%` vermilion | Second data series: the red seal, in its right place. |

Dark mode: "the lacquer". Lacquered blue-black (`210 20% 7%`), cards barely
lighter, jade lifted (`166 42% 46%`) with dark text on the CTAs. The semantic
tokens (statuses, success, warning) stay the engine's.

## Typography

- **Headings: Zen Kaku Gothic New.** A gothic drawn in Japan, tracking opened
  slightly (+0.025em, already in the theme): the air of contemporary Japanese
  signage. Weights 700-900 at display sizes.
- **Body: Noto Sans.** Sober, and above all covering every writing system: if
  the menu shows Japanese, Chinese, Korean or Thai, add the subsets in
  `site/fonts.ts` without changing family.

## Shapes

Crisp, close to square (0.375rem base, tightened scale): the lacquered tray,
ceramic with honest corners. Second most angular template after `food-truck`.

## Imagery (photos to upload in the CMS)

- **Hero**: a single dish seen from above on dark ceramic or a wooden table,
  an airy composition with plenty of empty space around it, soft side light.
  The emptiness is what makes it premium.
- **Products**: real tableware (bowls, trays), plain washi or slate
  background, visible steam on hot dishes, chopsticks laid down, never stuck
  upright.
- **About**: the counter, the gestures (slicing, plating, pouring tea), raw
  ingredients in crates.
- Avoid: decorative red lanterns, dragons, characters used as decoration
  without meaning, photos overloaded with "zen" props.

## Editorial tone (CMS copy)

Sober and precise: name the dishes correctly (donburi, gyoza, bao) with one
concrete line of description (broth, cooking method, side). No bolted-on
Oriental mystique, no exoticizing italics.

## Adapting to the client

1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature.
   A vermilion, an indigo or a deep plum work as well as the jade; stay at
   ≤ 30% lightness in light mode for the light text on the CTAs.
2. `--accent` / `--accent-foreground`: the same hue diluted for the
   background, darkened for the text.
3. If the client moves to vermilion for `--primary`, swap `--chart-2` for the
   jade (`168 46% 33%`) to keep two distinct series in the dashboard.
