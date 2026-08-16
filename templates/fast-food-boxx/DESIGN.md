# BOXX — Fast food

Burgers in a box, design in blocks. Demo brand: **BOXX**.

Identity: League Spartan for headings, Inter Tight for body text;
signature hsl(0 0% 9%); demo layout "hero: typographic poster / menu: bento".

Interactive preview of the full design: `demos/home.html?t=fast-food-boxx` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
