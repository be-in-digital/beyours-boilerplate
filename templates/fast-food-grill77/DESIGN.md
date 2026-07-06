# Grill 77 — Fast-food

Charbon, flamme, point.. Marque de démonstration : **Grill 77**.

Identité : titres en Oswald, texte en Onest ;
signature hsl(20 85% 36%) ; mise en page de démo « hero pleine image, carte registre numéroté ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-grill77` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
