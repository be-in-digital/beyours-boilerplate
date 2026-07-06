# Piri West — Poulet

Piri-piri braise et citron. Marque de démonstration : **Piri West**.

Identité : titres en Staatliches, texte en Be Vietnam Pro ;
signature hsl(8 80% 46%) ; mise en page de démo « hero diagonale couleur / photo, carte bento ».

Aperçu interactif du design complet : `demos/home.html?t=poulet-piriwest` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
