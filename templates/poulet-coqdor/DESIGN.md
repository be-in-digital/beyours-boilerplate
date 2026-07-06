# Coq d'Or — Poulet

Rôtisserie de quartier depuis 1962. Marque de démonstration : **Le Coq d'Or**.

Identité : titres en Playfair Display, texte en Public Sans ;
signature hsl(150 40% 26%) ; mise en page de démo « hero éditorial (photo ronde, récit), carte carte typographiée (lignes de points) ».

Aperçu interactif du design complet : `demos/home.html?t=poulet-coqdor` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
