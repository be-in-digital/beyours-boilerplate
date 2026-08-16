# Bánh Mì Club — Asian

Crisp baguette, Vietnamese heart. Demo brand: **Bánh Mì Club**.

Identity: Gabarito for headings, Onest for body text;
signature hsl(95 55% 32%); demo layout "hero: collage / menu: photo cards".

Interactive preview of the full design: `demos/home.html?t=asiatique-banhmi` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
