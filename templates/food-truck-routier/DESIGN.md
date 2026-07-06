# Le Routier — Food truck

Relais moderne, portions d'époque. Marque de démonstration : **Le Routier**.

Identité : titres en Oswald, texte en Onest ;
signature hsl(215 60% 30%) ; mise en page de démo « hero duo texte / photo, carte registre numéroté ».

Aperçu interactif du design complet : `demos/home.html?t=food-truck-routier` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
