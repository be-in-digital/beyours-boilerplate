# Le Fermier — Fast food

From the field to the bun. Demo brand: **Le Fermier**.

Identity: Libre Caslon Text for headings, Instrument Sans for body text;
signature hsl(355 55% 40%); demo layout "hero: text / photo split / menu: stacked tickets".

Interactive preview of the full design: `demos/home.html?t=fast-food-fermier` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
