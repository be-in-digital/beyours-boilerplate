# Bambou — Asiatique

Vapeur douce, bambou frais. Marque de démonstration : **Maison Bambou**.

Identité : titres en Sora, texte en Manrope ;
signature hsl(140 45% 30%) ; mise en page de démo « hero duo texte / photo, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=asiatique-bambou` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
