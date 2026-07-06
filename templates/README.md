# Templates design — catalogue

**50 directions artistiques** (10 par vertical restaurant) + le neutre engine.
Un template pose l'identité visuelle complète d'un site (couleurs clair/sombre,
sidebar admin, graphiques dashboard, polices, langue de formes) dans la
**zone client** : choisir le template à la création du site, puis ajuster les
couleurs à l'image du client dans `site/theme.css`.

Les 5 directions phares (une par vertical) sont détaillées ci-dessous et
maintenues à la main. Les 45 autres (`<catégorie>-<thème>`, ex.
`pizzeria-milano`, `asiatique-omakase`) sont **générées depuis les identités
de démo** (`node scripts/gen-templates.mjs`, source :
`demos/assets/themes.js`) : chaque `template.json` pointe vers l'aperçu
interactif `demos/home.html?t=<slug>`. `pnpm template:list` les liste tous.

| Slug | Direction | Signature | Titres / Texte |
| --- | --- | --- | --- |
| `pizzeria` | Trattoria, néo-napolitaine | Terracotta sur pierre chaude | Libre Bodoni / Figtree |
| `fast-food` | Smash, burger premium | Moutarde sur charbon (2 temps) | Bricolage Grotesque / Archivo |
| `food-truck` | Convoi, street craft | Pétrole émaillé sur kraft | Big Shoulders / Work Sans |
| `poulet` | Braise, rôtisserie urbaine | Piment sur crème | Barlow Condensed / Barlow |
| `asiatique` | Izakaya, contemporain | Jade et encre sur washi | Zen Kaku Gothic New / Noto Sans |
| `default` | Neutre engine | Orange | Poppins / Inter |

Aperçu visuel : ouvrir `templates/preview.html` dans un navigateur.
Direction détaillée (concept, imagerie, ton, adaptation client) : le
`DESIGN.md` de chaque template.

**Démos interactives** (`demos/`) : chaque univers a une boutique navigable
avec panier et paiement Stripe de test — un prospect teste le site réel avant
d'acheter. Ouvrir `demos/index.html` en local, ou déployer sur Vercel pour le
paiement de test réel. Voir `demos/README.md`.

## Utilisation

```bash
# à la création d'un site
beindigital create client-luigi --name "Chez Luigi" --template pizzeria
pnpm setup                       # le wizard propose le choix du template

# sur un site existant
pnpm template:list               # catalogue
pnpm template:apply poulet       # applique (écrase site/theme.css + site/fonts.ts)
pnpm template:apply default      # restaure le thème d'origine
```

L'application copie `templates/<slug>/theme.css` et `fonts.ts` vers `site/`
(zone client) et note le choix dans `.beindigital-site.json`. Rien d'autre
n'est modifié : mêmes routes, mêmes composants, mêmes mises à jour engine.

## Anatomie d'un template

```
templates/<slug>/
  template.json   # slug, label, description, signature, polices (catalogue CLI)
  theme.css       # tokens light/dark + sidebar + échelle de rayons + détails typo
  fonts.ts        # paire next/font (variables --font-inter / --font-poppins imposées)
  DESIGN.md       # direction artistique : concept, palette, imagerie, ton, adaptation
```

## Règles du catalogue

- **Contraste AA vérifié** : chaque palette passe WCAG AA (4.5:1) sur les
  paires texte/fond des deux modes, CTA et sidebar compris. Toute retouche
  couleur doit maintenir ces ratios.
- **Tokens sémantiques intouchés** : `--success`, `--warning`, `--info`,
  `--destructive` et `--status-*` restent ceux de l'engine. Ils portent du
  sens fonctionnel (cuisine, caisse, commandes) et ne font pas partie de
  l'identité.
- **Contrat engine respecté** : uniquement des surcharges prévues par
  `app/globals.css` (tokens HSL, sidebar en `hsl()` complet, variables de
  police) plus l'échelle `--radius-*` de Tailwind v4. Pas de sélecteurs
  dépendants du DOM des composants engine.
- **Photos et textes viennent du CMS** : un template ne fournit pas d'images.
  Les directives d'imagerie du `DESIGN.md` guident ce que le client charge
  dans le dashboard admin.

## Ajouter un template

1. Copier un dossier existant, renommer le slug.
2. Concevoir la palette (les deux modes + sidebar + charts), la paire de
   polices (`next/font/google`, garder les noms de variables) et l'échelle
   de rayons.
3. Vérifier le contraste AA des paires listées plus haut.
4. Documenter la direction dans `DESIGN.md`, renseigner `template.json`.
5. Ajouter le bloc correspondant dans `preview.html`.

Ce dossier appartient au boilerplate (jamais touché par `sync:engine`) et
descend sur les sites via `pnpm update:template`.
