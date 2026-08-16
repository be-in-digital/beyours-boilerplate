# Stacked — Fast food

The burger, front page. Demo brand: **Stacked**.

Identity: Playfair Display for headings, Public Sans for body text;
signature hsl(220 90% 50%); demo layout "hero: magazine / menu: photo mosaic".

Interactive preview of the full design: `demos/home.html?t=fast-food-stacked` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
