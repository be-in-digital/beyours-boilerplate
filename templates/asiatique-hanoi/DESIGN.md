# Hanoï — Asiatique

Bols et baguettes d'Indochine. Marque de démonstration : **Café Hanoï**.

Identité : titres en Marcellus, texte en Albert Sans ;
signature hsl(170 45% 28%) ; mise en page de démo « hero éditorial (photo ronde, récit), carte carte typographiée (lignes de points) ».

Aperçu interactif du design complet : `demos/home.html?t=asiatique-hanoi` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
