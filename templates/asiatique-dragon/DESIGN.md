# Dragon — Asiatique

Banquet cantonais, laque et or. Marque de démonstration : **Le Dragon**.

Identité : titres en Playfair Display, texte en Public Sans ;
signature hsl(42 70% 40%) ; mise en page de démo « hero diagonale couleur / photo, carte mosaïque photo ».

Aperçu interactif du design complet : `demos/home.html?t=asiatique-dragon` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
