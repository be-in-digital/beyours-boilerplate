# Braise en Route — Food truck

BBQ fumé, remorque noire. Marque de démonstration : **Braise en Route**.

Identité : titres en Bebas Neue, texte en Hanken Grotesk ;
signature hsl(15 70% 40%) ; mise en page de démo « hero pleine image, carte tickets empilés ».

Aperçu interactif du design complet : `demos/home.html?t=food-truck-braisenroute` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
