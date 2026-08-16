# Verace — Pizzeria

Neapolitan pizza, basta. Demo brand: **Verace**.

Identity: Familjen Grotesk for headings, Karla for body text;
signature hsl(145 45% 26%); demo layout "hero: pared back, airy / menu: single column, hairline rules".

Interactive preview of the full design: `demos/home.html?t=pizzeria-verace` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
