# Seoul Street — Food truck

Corée de rue, feu doux et gochujang. Marque de démonstration : **Seoul Street**.

Identité : titres en Space Grotesk, texte en Karla ;
signature hsl(350 85% 46%) ; mise en page de démo « hero bandeau direct, carte onglets collants ».

Aperçu interactif du design complet : `demos/home.html?t=food-truck-seoulstreet` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
