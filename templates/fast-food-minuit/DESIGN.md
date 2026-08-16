# Minuit — Fast food

The burger after the party. Demo brand: **Burger Minuit**.

Identity: Space Grotesk for headings, Karla for body text;
signature hsl(270 60% 48%); demo layout "hero: straight banner / menu: sticky tabs".

Interactive preview of the full design: `demos/home.html?t=fast-food-minuit` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
