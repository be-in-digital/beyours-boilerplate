# Démos interactives — BeYours

**50 démos de sites complets** : 5 thématiques (catégories) × **10 thèmes
chacune**, chaque thème avec sa **propre identité** (marque, palette
clair/sombre, typographies, formes, texture) et sa **propre mise en page**
(type de hero, présentation de la carte, navigation, footer). Un prospect
ouvre le lien, navigue un **site multipage** (accueil, carte, à propos,
adresses, réservation, contact), commande, réserve, annule, et va jusqu'au
**paiement en mode test Stripe**.

Garanties :

- **Tous les liens fonctionnent** : navigation, footer, téléphone (`tel:`),
  e-mail (`mailto:`), itinéraires Google Maps, réservation (créable **et
  annulable**), formulaires validés. Zéro `href="#"` (balayé en navigateur).
- **Multi-emplacements** : chaque thème a 1 à 3 lieux ; le client choisit son
  lieu (page Adresses), il suit la commande jusqu'au checkout et la
  réservation. Les thèmes à 1 lieu montrent aussi ce cas.
- **10 designs par catégorie réellement différents** : chaque thème d'une
  catégorie a une combinaison hero × carte unique (10 familles de hero,
  8 familles de carte, 4 navigations, 5 langues de boutons, textures),
  vérifiée par script. Contraste : 400 paires AA vérifiées (50 thèmes × 2 modes).

```
demos/
  index.html            showroom : 5 catégories × 10 thèmes
  home.html?t=<theme>   accueil          \
  menu.html             la carte          |
  about.html            à propos          |  pages du site, rendues par le
  locations.html        adresses / lieux  |  moteur selon le thème choisi
  reserve.html          réservation       |
  contact.html          contact           |
  checkout.html         paiement (carte de test Stripe)
  success.html          confirmation     /
  pizzeria.html …       redirections des anciennes URL vers le thème 1
  assets/
    themes.js           50 identités + packs catégorie (plats, lieux, story)
    site.css            familles de mise en page (pilotées par data-attributes)
    site.js             moteur multipage : thème, panier, lieux, réservation
    shots/              captures réelles des 50 accueils (galerie du showroom)
  api/checkout.js       fonction serverless : session Stripe Checkout (TEST)
  package.json          dépendance stripe (installée par Vercel)
  vercel.json           liens propres + noindex
```

Exemples d'identités dans une même catégorie (pizzeria) : Trattoria
(éditorial serif, photo ronde), Vesuvio (affiche brutale Anton, bento),
Milano (magazine Playfair, mosaïque), Golfo (collage méditerranéen),
Doppio Zero (minimal suisse, registre), Notte (sombre nuit, barre de
commande)… Aucun ne partage sa mise en page avec un autre de sa catégorie.

**Ajouter un 11e thème** : une entrée dans `assets/themes.js` (palette L/D,
paire de polices, combinaison hero/menu/nav/footer, copy) et c'est en ligne :
les pages, le panier, les lieux et la réservation sont fournis par le moteur.
Les plats et prix restent ceux du pack de la catégorie (alignés sur
`api/checkout.js`, source d'autorité des prix).

## Aperçu local (sans Stripe)

Ouvrir `demos/index.html` dans un navigateur. Tout est navigable ; au moment
de payer, comme il n'y a pas de backend en local, la démo **simule** le
paiement et affiche la page de confirmation. C'est le mode `?sim=1`.

## Déploiement (Vercel) — paiement de test réel

Le paiement de test réel (redirection vers la page Stripe où le client saisit
`4242 4242 4242 4242`) nécessite la fonction serverless et **une clé Stripe de
test**. La clé vit uniquement dans les variables d'env Vercel, jamais dans le
dépôt.

1. **Projet Vercel** pointant sur ce dossier :
   ```bash
   cd demos
   vercel        # (ou : nouveau projet Vercel, Root Directory = demos/)
   ```
   Vercel détecte les fichiers statiques + la fonction `api/checkout.js` et
   installe `stripe` tout seul.

2. **Clé Stripe de test** (Dashboard Stripe → Développeurs → Clés API, en
   mode Test, `sk_test_…`) posée en variable d'env :
   ```bash
   vercel env add STRIPE_SECRET_KEY   # coller la sk_test_… ; Production + Preview
   vercel --prod                      # redéployer pour appliquer
   ```
   Tant que la variable n'est pas là, l'API renvoie 501 et la démo retombe
   proprement sur la simulation (rien ne casse).

3. **Lien par client** : le showroom `https://<projet>.vercel.app/` (choix
   des 50 thèmes), ou directement un thème :
   `https://<projet>.vercel.app/home?t=pizzeria-milano`. Les anciennes URL
   (`/pizzeria`, `/poulet`…) redirigent vers le premier thème de la catégorie.

Aucune clé **publique** n'est nécessaire ici : la fonction crée une session
Stripe Checkout hébergée et renvoie son URL ; le client saisit sa carte de
test sur la page Stripe, pas sur la démo.

## Carte de test Stripe

Affichée sur la page de paiement, à donner au prospect :

| Champ | Valeur |
| --- | --- |
| Numéro | `4242 4242 4242 4242` |
| Date d'expiration | n'importe quelle date future (ex. 12/34) |
| CVC | 3 chiffres au hasard |
| Code postal | 75000 |

Autres scénarios (paiement refusé, 3D Secure…) : voir
[stripe.com/docs/testing](https://stripe.com/docs/testing). Toujours rester en
**mode Test** ; ces démos ne doivent jamais utiliser une clé `sk_live_…`.

## Personnaliser une démo pour un rendez-vous

Tout est dans `assets/themes.js` : l'identité du thème (marque, baseline,
palette, polices, mise en page, nombre de lieux, copy du hero) et les packs
de catégorie (plats, lieux avec adresses/horaires/téléphones, story,
contact). Pour coller à un prospect précis : dupliquer le thème le plus
proche, changer marque/couleurs/copy, et partager
`home.html?t=<son-theme>`. Garder les `id` de plats alignés avec
`api/checkout.js` (source d'autorité des prix côté paiement).

## Analytics (opt-in, off par défaut)

Le moteur émet des événements de vente (`demo_theme_viewed`, `add_to_cart`,
`begin_checkout`, `order_paid`, `reservation_made`) et les pages vues, **si et
seulement si** une clé PostHog publique est fournie. Aucune clé n'est commitée,
aucun réseau tant qu'elle est absente. Pour activer, injecter avant `site.js` :

```html
<script>window.POSTHOG_KEY = "phc_votre_cle_publique"; /* window.POSTHOG_HOST optionnel */</script>
```

(par exemple via une balise ajoutée aux coquilles, ou une variable injectée au
déploiement). On sait alors quels thèmes les prospects regardent et où ils
décrochent.

## Régénérer les captures du showroom

Le showroom (`index.html`) affiche les **captures réelles** des 50 accueils
(`assets/shots/<themeId>.jpg`, cliquables en visionneuse). Après une retouche
de thème, re-capturer : servir `demos/` en local, ouvrir chaque
`home.html?t=<themeId>` dans un navigateur headless en 1280×800, capturer la
vue, puis convertir en JPEG ~840 px (ex. `sips -s format jpeg
-s formatOptions 74 --resampleWidth 840`). Un thème seul se recapture à
l'unité, inutile de refaire les 50.

## Lien avec l'engine (important)

Ces démos montrent la cible : un design propre par thématique, pas un thème
unique recolorié. Deux niveaux à distinguer côté production :

1. **Le storefront de l'engine code ses couleurs en dur** (vert + orange) :
   même un template tokenisé ne recolore pas encore les pages marketing.
   Premier chantier engine : remplacer les couleurs en dur par les tokens
   (`bg-primary`/`bg-background`…).
2. **Un design par thématique** (ces démos) suppose, à terme, que l'engine
   sache servir des **mises en page différentes** selon la thématique
   (pas seulement des tokens différents) — via des variantes de composants ou
   des layouts par thème. Ces fichiers `<slug>.html` sont la référence de ce
   que chaque thématique doit rendre.
