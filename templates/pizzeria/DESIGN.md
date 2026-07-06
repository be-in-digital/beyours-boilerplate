# Trattoria — pizzeria napolitaine

Direction pour une pizzeria artisanale premium : four à bois, pâte maturée,
produits DOP. Le registre de la néo-trattoria (généreux, italien, soigné),
pas celui de la chaîne de livraison.

## Concept

Le four est le centre. La palette part des matières réelles de la pizzeria
napolitaine : terre cuite des fours, pierre claire des plans de travail,
braise le soir. C'est une direction chaude assumée parce que c'est le code
chromatique authentique de ce vertical, pas un défaut « premium beige ».

## Palette

| Token | Valeur (clair) | Rôle |
| --- | --- | --- |
| `--primary` | `14 68% 44%` terracotta | CTA, prix, liens forts. La couleur du four. |
| `--background` | `28 33% 97%` pierre chaude | Fond général, jamais blanc pur. |
| `--foreground` | `18 38% 12%` brun profond | Texte. Un noir chaud, pas un noir bleu. |
| `--accent` | `14 58% 95%` | Fonds de badge, survols, zones mises en avant. |
| `--secondary` / `--muted` | `28 26% 92-93%` | Fonds secondaires, tags, filtres. |

Le mode sombre est « le four le soir » : brun brûlé très sombre (pas de gris
neutre), terracotta éclairci en braise (`15 74% 58%`) avec texte foncé sur
les CTA. Les tokens sémantiques (statuts de commande, succès, alerte) restent
ceux de l'engine : ils portent du sens fonctionnel en cuisine et en caisse.

## Typographie

- **Titres : Libre Bodoni.** Didone italienne, forte personnalité éditoriale,
  contraste élevé. Resserrée de -0.015em en display (déjà dans le thème).
- **Texte : Figtree.** Ronde et claire, elle laisse la didone porter le
  caractère. Ne jamais mettre la didone en petit corps utilitaire.

## Formes

Arrondis généreux (`--radius-*` élargis, base 0.75rem) : cartes et boutons
conviviaux, proches de l'assiette et de la nappe, sans tomber dans le bubbly.

## Imagerie (photos à charger dans le CMS)

- **Hero** : pizza entière juste sortie du four, cadrage serré 3/4, lumière
  chaude directionnelle (fin de journée), fond sombre ou table bois. Vapeur
  et leopard spotting visibles : la preuve du four à bois.
- **Produits** : fond uni pierre/bois chaud, ombres douces, tranche coupée ou
  ingrédient signature visible (burrata, basilic). Cohérence de lumière sur
  toute la grille.
- **À propos** : le pizzaiolo au four, farine en suspension, mains dans la
  pâte. Reportage, pas banque d'images.
- À éviter : photos plates éclairées au flash, stock générique avec drapeaux
  italiens, mozzarella filante en gros plan cliché.

## Ton éditorial (textes CMS)

Direct et gourmand, vocabulaire du produit (maturation 48 h, San Marzano,
fior di latte). Phrases courtes. Pas de superlatifs vides (« le meilleur de
la ville »), la précision artisanale fait le premium.

## Adapter au client

1. `--primary` + `--ring` (et `--sidebar-primary`) : la couleur signature du
   client, en gardant une luminosité ≤ 48 % en clair pour tenir le contraste
   AA avec le texte blanc des boutons.
2. `--accent` / `--accent-foreground` : décliner la même teinte (saturation
   basse pour le fond, foncée pour le texte).
3. Les neutres (`--background`, `--border`, `--muted`) peuvent rester : ils
   sont dessinés pour porter n'importe quelle signature chaude. Pour un
   client à identité froide, partir plutôt du template `asiatique` ou
   `food-truck` et garder ces neutres-ci pour les verticaux chauds.
