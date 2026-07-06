# BOXX — Fast-food

Burgers en boîte, design en briques. Marque de démonstration : **BOXX**.

Identité : titres en League Spartan, texte en Inter Tight ;
signature hsl(0 0% 9%) ; mise en page de démo « hero affiche typographique, carte bento ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-boxx` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
