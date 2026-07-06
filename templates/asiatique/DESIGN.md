# Izakaya — asiatique contemporain

Direction pour un restaurant asiatique contemporain : izakaya, ramen-ya,
comptoir coréen ou pan-asiatique de quartier. Le registre de la précision
calme, pas le folklore lanternes-et-dragons.

## Concept

L'encre et le jade sur papier. Un fond washi (papier japonais, chaud et mat),
un texte encre sumi légèrement bleuté, et une seule couleur : un jade profond,
celui de la céramique et du thé. Le rouge vermillon, code attendu du vertical,
est volontairement réservé aux graphiques et aux touches secondaires : c'est
la retenue qui distingue un izakaya premium d'un buffet.

## Palette

| Token | Valeur (clair) | Rôle |
| --- | --- | --- |
| `--primary` | `168 46% 27%` jade profond | CTA, prix, navigation active. Céramique et thé. |
| `--background` | `46 25% 97%` washi | Fond général, papier chaud et mat. |
| `--foreground` | `210 14% 11%` encre sumi | Texte, noir bleuté d'encre. |
| `--accent` | `168 30% 92%` | Fonds de badge et survols, jade dilué. |
| `--secondary` / `--muted` | `46 14% 92%` | Fonds secondaires côté papier. |
| `--chart-2` | `8 72% 52%` vermillon | Deuxième série de données : le sceau rouge, à sa place. |

Mode sombre : « la laque ». Bleu-noir laqué (`210 20% 7%`), cartes à peine
plus claires, jade éclairci (`166 42% 46%`) avec texte sombre sur les CTA.
Les tokens sémantiques (statuts, succès, alerte) restent ceux de l'engine.

## Typographie

- **Titres : Zen Kaku Gothic New.** Gothique dessinée au Japon, chasse
  légèrement ouverte (+0.025em, déjà dans le thème) : l'air des enseignes
  japonaises contemporaines. Graisses 700-900 en display.
- **Texte : Noto Sans.** Sobre, et surtout couvrant tous les systèmes
  d'écriture : si la carte affiche du japonais, du chinois, du coréen ou du
  thaï, ajouter les subsets dans `site/fonts.ts` sans changer de famille.

## Formes

Nettes, presque au carré (base 0.375rem, échelle resserrée) : le plateau
laqué, la céramique aux angles francs. Deuxième template le plus anguleux
après `food-truck`.

## Imagerie (photos à charger dans le CMS)

- **Hero** : un plat unique vu de haut sur céramique sombre ou table bois,
  composition aérée avec beaucoup de vide autour, lumière douce latérale.
  Le vide fait le premium.
- **Produits** : vaisselle réelle (bols, plateaux), fond uni washi ou ardoise,
  vapeur visible sur les plats chauds, baguettes posées, jamais plantées.
- **À propos** : le comptoir, les gestes (découpe, dressage, service du thé),
  les ingrédients bruts en caisses.
- À éviter : lanternes rouges décoratives, dragons, caractères utilisés comme
  décor sans sens, photos surchargées d'accessoires « zen ».

## Ton éditorial (textes CMS)

Sobre et précis : nommer les plats correctement (donburi, gyoza, bao) avec
une ligne de description concrète (bouillon, cuisson, accompagnement).
Pas de mystique orientale plaquée, pas d'italiques exotisants.

## Adapter au client

1. `--primary` + `--ring` + `--sidebar-primary` : la signature du client.
   Un vermillon, un indigo ou un prune profond fonctionnent aussi bien que
   le jade ; rester ≤ 30 % de luminosité en clair pour le texte clair des CTA.
2. `--accent` / `--accent-foreground` : même teinte diluée en fond, foncée
   en texte.
3. Si le client passe au vermillon en `--primary`, remplacer `--chart-2` par
   le jade (`168 46% 33%`) pour garder deux séries distinctes en dashboard.
