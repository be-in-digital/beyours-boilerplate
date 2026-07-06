# Diner 56 — Fast-food

Le diner américain, version 2026. Marque de démonstration : **Diner 56**.

Identité : titres en Alfa Slab One, texte en Epilogue ;
signature hsl(350 75% 45%) ; mise en page de démo « hero collage, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-dinerclassic` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
