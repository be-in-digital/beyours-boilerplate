# Minuit — Fast-food

Le burger d'après la fête. Marque de démonstration : **Burger Minuit**.

Identité : titres en Space Grotesk, texte en Karla ;
signature hsl(270 60% 48%) ; mise en page de démo « hero bandeau direct, carte onglets collants ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-minuit` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
