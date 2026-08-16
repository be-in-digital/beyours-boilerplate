# Pit Stop — Food truck

Express refueling. Demo brand: **Pit Stop**.

Identity: Saira Condensed for headings, Onest for body text;
signature hsl(0 85% 45%); demo layout "hero: typographic poster / menu: bento".

Interactive preview of the full design: `demos/home.html?t=food-truck-pitstop` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
