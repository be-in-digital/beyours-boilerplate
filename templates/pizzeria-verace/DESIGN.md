# Verace — Pizzeria

Pizza napolitaine, basta. Marque de démonstration : **Verace**.

Identité : titres en Familjen Grotesk, texte en Karla ;
signature hsl(145 45% 26%) ; mise en page de démo « hero épuré, aéré, carte colonne unique en filets fins ».

Aperçu interactif du design complet : `demos/home.html?t=pizzeria-verace` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
