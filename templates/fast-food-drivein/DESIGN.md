# Drive-In — Fast-food

Commande roulante depuis 1987. Marque de démonstration : **Drive-In**.

Identité : titres en Passion One, texte en Gabarito ;
signature hsl(205 80% 40%) ; mise en page de démo « hero tableau des emplacements, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=fast-food-drivein` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
