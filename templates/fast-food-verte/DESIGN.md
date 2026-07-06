# La Verte — Fast-food

Fast-food, bonne conscience. Marque de démonstration : **La Verte**.

Identité : titres en Sora, texte en Manrope ;
signature hsl(150 45% 30%) ; mise en page de démo « hero épuré, aéré, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-verte` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
