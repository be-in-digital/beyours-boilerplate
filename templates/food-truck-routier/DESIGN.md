# Le Routier — Food truck

Modern roadside stop, old-school portions. Demo brand: **Le Routier**.

Identity: Oswald for headings, Onest for body text;
signature hsl(215 60% 30%); demo layout "hero: text / photo split / menu: numbered ledger".

Interactive preview of the full design: `demos/home.html?t=food-truck-routier` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
