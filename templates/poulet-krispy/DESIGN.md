# Krispy Krush — Chicken

Crunch turned all the way up. Demo brand: **Krispy Krush**.

Identity: Passion One for headings, Gabarito for body text;
signature hsl(26 90% 38%); demo layout "hero: collage / menu: photo cards".

Interactive preview of the full design: `demos/home.html?t=poulet-krispy` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
