# Stacked — Fast-food

Le burger en une. Marque de démonstration : **Stacked**.

Identité : titres en Playfair Display, texte en Public Sans ;
signature hsl(220 90% 50%) ; mise en page de démo « hero magazine, carte mosaïque photo ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-stacked` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
