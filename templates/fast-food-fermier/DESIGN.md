# Le Fermier — Fast-food

Du champ au bun. Marque de démonstration : **Le Fermier**.

Identité : titres en Libre Caslon Text, texte en Instrument Sans ;
signature hsl(355 55% 40%) ; mise en page de démo « hero duo texte / photo, carte tickets empilés ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-fermier` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
