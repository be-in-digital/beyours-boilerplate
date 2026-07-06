# Basilico — Pizzeria

Verte, fraîche, végétale. Marque de démonstration : **Casa Basilico**.

Identité : titres en Gabarito, texte en Onest ;
signature hsl(120 40% 30%) ; mise en page de démo « hero pleine image, carte cartes photo ».

Aperçu interactif du design complet : `demos/home.html?t=pizzeria-basilico` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
