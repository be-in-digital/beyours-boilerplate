# Doppio Zero — Pizzeria

Farine 00, design 0 fioriture. Marque de démonstration : **Doppio Zero**.

Identité : titres en Sora, texte en Manrope ;
signature hsl(240 8% 12%) ; mise en page de démo « hero bandeau direct, carte registre numéroté ».

Aperçu interactif du design complet : `demos/home.html?t=pizzeria-doppiozero` (ou la
galerie `demos/index.html`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. `--primary` + `--ring` + `--sidebar-primary` : la couleur signature du
   client (garder un contraste AA avec `--primary-foreground`).
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (`--success`, `--warning`, `--destructive`,
   `--status-*`) : laissés à l'engine, ne pas les redéfinir.
