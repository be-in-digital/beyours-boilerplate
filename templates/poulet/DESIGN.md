# Braise — rôtisserie urbaine (fast poulet)

Direction pour un fast food poulet type « Master Poulet » : poulet frit
croustillant, marinades maison, buckets à partager. Le registre de la
rôtisserie urbaine fière de son produit, entre l'affiche de quartier et le
comptoir moderne.

## Concept

La braise et la crème. Un rouge piment profond, celui de la marinade et du
gril, posé sur un fond crème chaud, celui de la panure dorée. L'énergie est
typographique : une condensée d'affiche qui monte fort en graisse, comme les
enseignes de rôtisserie. Une seule couleur signature, pas de jaune poussin ni
de dégradés flammes.

## Palette

| Token | Valeur (clair) | Rôle |
| --- | --- | --- |
| `--primary` | `355 70% 42%` rouge piment | CTA, prix, promotions. La marinade. |
| `--background` | `42 45% 97%` crème | Fond général, la panure dorée en très clair. |
| `--foreground` | `8 22% 11%` noir fumé | Texte, noir réchauffé côté rouge. |
| `--accent` | `355 58% 95%` | Fonds de badge et survols, piment dilué. |
| `--secondary` / `--muted` | `42 28% 92%` | Fonds secondaires côté crème. |

Mode sombre : « la braise ». Noir fumé teinté rouge (`8 16% 7%`), le piment
monte à `50 %` et garde un texte crème : le contraste d'une enseigne allumée
tard. Les tokens sémantiques (statuts, succès, alerte) restent ceux de
l'engine ; ne pas confondre le rouge signature avec le rouge destructif,
c'est le rôle de `--destructive` qui reste distinct.

## Typographie

- **Titres : Barlow Condensed.** Condensée d'affiche, graisses 600-800.
  Un soupçon de chasse (déjà dans le thème) pour respirer en grand corps.
- **Texte : Barlow.** Même dessin en largeur normale : la cohérence d'une
  famille unique, du hero au ticket. Lisible et dense pour les menus longs.

## Formes

Arrondis contenus (base 0.5rem) : plus franc qu'une trattoria, moins pill
qu'un burger. L'esprit affiche : les blocs tiennent droit.

## Imagerie (photos à charger dans le CMS)

- **Hero** : le poulet croustillant en très gros plan, texture de panure
  nette, lumière chaude directionnelle, fond sombre uni. La brillance de la
  sauce (hot honey, marinade) accroche la lumière.
- **Produits** : buckets et boxes vus de 3/4, fond crème ou rouge uni, sauces
  ouvertes à côté, même distance de prise pour toute la grille.
- **À propos** : le gril et la friteuse en action, les marinades en bocaux,
  l'équipe. Vapeur et flammes réelles, pas d'effets ajoutés.
- À éviter : poulet pâle, photos sur fond blanc clinique, mascotte cartoon,
  imagerie « flammes » en illustration.

## Ton éditorial (textes CMS)

Fier et frontal : le produit parle (« Mariné 24 h. Frit à la commande. »).
Phrases courtes, chiffres concrets (pièces, sauces, temps de marinade).
L'humour léger passe bien dans les noms de menus, jamais dans les infos
pratiques.

## Adapter au client

1. `--primary` + `--ring` + `--sidebar-primary` : la signature du client.
   Rester ≤ 45 % de luminosité en clair pour tenir le AA avec le texte
   crème des CTA.
2. `--accent` / `--accent-foreground` : même teinte diluée en fond, foncée
   en texte.
3. Le crème du fond peut glisser vers un blanc plus neutre si la charte du
   client est froide ; garder alors le noir fumé du texte pour ne pas
   basculer dans le clinique.
