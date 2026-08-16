# Coq d'Or — Chicken

Neighborhood rotisserie since 1962. Demo brand: **Le Coq d'Or**.

Identity: Playfair Display for headings, Public Sans for body text;
signature hsl(150 40% 26%); demo layout "hero: editorial (round photo, story) / menu: typeset with dot leaders".

Interactive preview of the full design: `demos/home.html?t=poulet-coqdor` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
