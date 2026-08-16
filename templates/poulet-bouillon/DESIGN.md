# Le Bouillon — Chicken

Poule au pot and roast poultry. Demo brand: **Le Bouillon**.

Identity: Cormorant Garamond for headings, Outfit for body text;
signature hsl(355 60% 34%); demo layout "hero: magazine / menu: numbered ledger".

Interactive preview of the full design: `demos/home.html?t=poulet-bouillon` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
