# Braise en Route — Food truck

Smoked BBQ, black trailer. Demo brand: **Braise en Route**.

Identity: Bebas Neue for headings, Hanken Grotesk for body text;
signature hsl(15 70% 40%); demo layout "hero: full-bleed image / menu: stacked tickets".

Interactive preview of the full design: `demos/home.html?t=food-truck-braisenroute` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
