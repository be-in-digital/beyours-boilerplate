# Bánh Mì Club — Asiatique

Baguette croustillante, cœur vietnamien. Marque de démonstration : **Bánh Mì Club**.

Identité : titres en Gabarito, texte en Onest ;
signature hsl(95 55% 32%) ; mise en page de démo « hero collage, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=asiatique-banhmi` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
