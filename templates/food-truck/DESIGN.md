# Convoi — food truck street craft

Direction pour un food truck ou un concept nomade : cuisine courte, produits
frais, service au guichet. Le registre de l'artisan mobile qui assume la
route, pas la « street food » décorative des zones commerciales.

## Concept

La carrosserie émaillée. Un bleu pétrole profond, celui des camions repeints
à la main, posé sur un fond kraft clair, celui de l'emballage papier et de
l'ardoise du jour. Le contraste chaud/froid (kraft contre pétrole) est la
signature du template : les quatre autres verticaux sont monotempérature,
celui-ci joue l'attelage.

## Palette

| Token | Valeur (clair) | Rôle |
| --- | --- | --- |
| `--primary` | `192 62% 27%` bleu pétrole | CTA, prix, navigation active. L'émail du camion. |
| `--background` | `40 26% 96%` kraft clair | Fond général, papier d'emballage. |
| `--foreground` | `202 28% 13%` encre bleutée | Texte, froid sur fond chaud. |
| `--accent` | `192 38% 92%` | Fonds de badge et survols, pétrole dilué. |
| `--secondary` / `--muted` | `40 18% 90-91%` | Fonds secondaires côté kraft. |

Mode sombre : « service de nuit ». Encre pétrole très sombre, cartes à peine
plus claires, le pétrole s'éclaircit (`189 55% 47%`) comme une enseigne LED
de camion, texte foncé sur les CTA. Les tokens sémantiques (statuts, succès,
alerte) restent ceux de l'engine.

## Typographie

- **Titres : Big Shoulders.** Condensée industrielle, un dixième d'em de
  chasse en plus (déjà dans le thème) : le lettrage peint du camion. Gras
  600-800 sur les grands titres.
- **Texte : Work Sans.** Neutre robuste, conçue pour les petits corps :
  menus, allergènes, horaires d'emplacement.

## Formes

Angles nets (échelle `--radius-*` resserrée, base 0.375rem) : caisse
d'outillage, étiquette embossée, stencil. C'est le template le plus anguleux
du catalogue, ne pas radoucir les cartes au cas par cas.

## Imagerie (photos à charger dans le CMS)

- **Hero** : le camion en situation réelle (marché, bord de route, festival),
  lumière naturelle, clients en file floutés en arrière-plan. Ou le plat
  signature tenu en main devant le camion.
- **Produits** : posés sur kraft ou barquette réelle, vus de haut (flat lay)
  avec ombre naturelle, même hauteur de prise pour toute la grille.
- **À propos** : la route, l'intérieur du camion en plein service, le
  tableau des emplacements de la semaine.
- À éviter : fonds studio, vaisselle de restaurant assis, tout ce qui nie la
  mobilité du concept.

## Ton éditorial (textes CMS)

Parlé, précis, un peu télégraphique : le style de l'ardoise (« Aujourd'hui :
place du marché, 11 h 30 - 14 h »). Les emplacements et horaires sont du
contenu de premier rang, pas des mentions de bas de page.

## Adapter au client

1. `--primary` + `--ring` + `--sidebar-primary` : la couleur de carrosserie
   du client (émail vert bouteille, rouge pompier, orange trafic). Garder
   une luminosité ≤ 32 % en clair pour le texte clair des CTA, ou passer
   `--primary-foreground` en foncé si la couleur est vive.
2. `--accent` / `--accent-foreground` : même teinte, diluée en fond, foncée
   en texte.
3. Le fond kraft est la moitié de l'identité : ne le remplacer par un blanc
   neutre que si le client a déjà une charte imprimée froide.
