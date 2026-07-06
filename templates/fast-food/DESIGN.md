# Smash — burger premium

Direction pour un fast food burger de nouvelle génération : smash patties,
buns maison, frites fraîches. Le registre des comptoirs premium (Dumbo,
Shake Shack), pas celui de la franchise rouge et jaune.

## Concept

Le contraste moutarde sur charbon, en deux temps. De jour, le comptoir est
charbon et crème : CTA presque noirs, la moutarde vit dans les badges, les
survols et les données (un jaune moyen en texte sur fond clair ne tient
jamais le contraste, aucune exécution sérieuse ne le fait). De nuit, le
rapport s'inverse : la moutarde devient le néon du diner et porte les CTA
avec un texte foncé. Aucun dégradé, aucun rouge ketchup en accent : la
retenue chromatique fait le premium.

## Palette

| Token | Valeur (clair) | Rôle |
| --- | --- | --- |
| `--primary` | `40 18% 11%` charbon | CTA et navigation active de jour. |
| `--background` | `45 27% 97%` blanc cassé chaud | Fond général. |
| `--foreground` | `40 15% 9%` charbon chaud | Texte, presque noir. |
| `--accent` | `44 85% 90%` moutarde diluée | Fonds de badge, survols : la signature de jour. |
| `--chart-1` | `42 92% 46%` moutarde | Première série de données, et couleur de sélection. |
| `--secondary` / `--muted` | `45 16% 92%` | Fonds secondaires, filtres, tags. |

Mode sombre : charbon profond (`40 12% 7%`), cartes à peine plus claires, et
`--primary` passe à la moutarde (`42 96% 54%`, texte foncé dessus, jamais
blanc) : l'enseigne s'allume. Les tokens sémantiques (statuts, succès,
alerte) restent ceux de l'engine.

## Typographie

- **Titres : Bricolage Grotesque.** Charnue, un peu insolente, très actuelle.
  Serrée de -0.02em en display (déjà dans le thème). Les grands titres
  supportent le gras 700-800.
- **Texte : Archivo.** Utilitaire et dense, impeccable sur les cartes
  produits, les options et le checkout.

## Formes

Arrondis larges (base 0.875rem, boutons presque pill) : la rondeur du bun,
l'énergie du comptoir. Cohérente partout, y compris les champs de formulaire.

## Imagerie (photos à charger dans le CMS)

- **Hero** : burger en gros plan frontal, empilage net, fond charbon ou
  moutarde uni, lumière dure et franche (flash maîtrisé, ombres nettes).
  Le cheese pull et le smash croustillant sont les héros.
- **Produits** : fond uni sombre ou moutarde, même angle pour toute la grille
  (3/4 légèrement plongé), produit seul, pas de mise en scène chargée.
- **À propos** : la plancha, le geste du smash, l'équipe au comptoir.
  Grain léger accepté, énergie de service réelle.
- À éviter : photos catalogues sur fond blanc pur, compositions « food
  styling » léchées avec accessoires, drapeaux américains.

## Ton éditorial (textes CMS)

Court, direct, sûr de lui. Les noms de produits font le show (« Le Double
Smash »), les descriptions donnent la construction exacte du burger. Pas
d'anglicismes gratuits hors noms propres, pas de points d'exclamation en
rafale.

## Adapter au client

1. **Signature claire** (jaune, orange, vert acide) : garder le schéma en
   deux temps tel quel. Mettre la couleur du client dans `--accent`,
   `--chart-1` et le `--primary` du mode sombre (texte foncé dessus) ; les
   CTA de jour restent charbon.
2. **Signature foncée** (bordeaux, vert bouteille, bleu nuit) : elle peut
   prendre `--primary` + `--ring` + `--sidebar-primary` directement dans les
   deux modes, avec `--primary-foreground` clair et un ratio vérifié 4.5:1.
3. `--accent` / `--accent-foreground` : toujours la même teinte que la
   signature, diluée en fond, foncée en texte.
4. Les neutres charbon fonctionnent avec toute signature saturée : c'est le
   fond de scène, ne pas le teinter vers la couleur du client.
