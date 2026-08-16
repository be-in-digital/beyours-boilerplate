# La Verte — Fast food

Fast food with a clear conscience. Demo brand: **La Verte**.

Identity: Sora for headings, Manrope for body text;
signature hsl(150 45% 30%); demo layout "hero: pared back, airy / menu: photo cards".

Interactive preview of the full design: `demos/home.html?t=fast-food-verte` (or the
`demos/index.html` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. `--primary` + `--ring` + `--sidebar-primary`: the client's signature
   color (keep AA contrast against `--primary-foreground`).
2. `--accent` / `--accent-foreground`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (`--success`, `--warning`, `--destructive`,
   `--status-*`): left to the engine, do not redefine them.
