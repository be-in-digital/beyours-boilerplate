# Le Fermier — Poulet

Élevé dehors, rôti dedans. Marque de démonstration : **Poulet Fermier**.

Identité : titres en Libre Caslon Text, texte en Instrument Sans ;
signature hsl(95 40% 30%) ; mise en page de démo « hero duo texte / photo, carte tickets empilés ».

Aperçu interactif du design complet : `demos/home.html?t=poulet-fermierchic` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
