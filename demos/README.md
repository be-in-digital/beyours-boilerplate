# Démos interactives — BeInDigital

Cinq **démos navigables**, une par thématique (catégorie). Un prospect ouvre
le lien, parcourt la carte, ajoute au panier et va jusqu'au **paiement en mode
test Stripe** avec une carte de test. Objectif : vendre en montrant le site
réel qu'il aura, pas des captures.

**Chaque thématique a son design entièrement dédié** — mise en page, ambiance
et parcours propres, pas seulement des couleurs :

| Catégorie | Thème | Parti pris de design |
| --- | --- | --- |
| Pizzeria | Trattoria | Éditorial « carte imprimée » : menu typographié, photo ronde, récit du four |
| Fast-food | Smash | App de commande sombre : onglets collants, cartes chunky, barre de commande fixe |
| Food truck | Convoi | Ardoise de rue kraft : planning des emplacements, menu en tickets, prix monospace |
| Poulet | Braise | Poster rôtisserie : bandeau promo, buckets à partager, sélecteur de sauces |
| Asiatique | Izakaya | Minimal zen : colonne unique, filets fins, grand blanc |

```
demos/
  index.html          showroom : catégories → thèmes
  pizzeria.html       \
  fast-food.html       |  un store bespoke par thématique
  food-truck.html      |  (design + CSS + JS propres, dans le fichier)
  poulet.html          |
  asiatique.html      /
  checkout.html       récap + carte de test + bouton Payer   (partagé, thémé)
  success.html        confirmation                           (partagé, thémé)
  assets/
    data.js           données des univers (tokens, polices, menu, photos, catégorie)
    demo.js           helpers window.BID (thème, panier, toast) + pages checkout/success
    demo.css          styles des pages checkout/success
  api/checkout.js      fonction serverless : session Stripe Checkout (TEST)
  package.json         dépendance stripe (installée par Vercel)
  vercel.json          liens propres + noindex
```

Structure catégorie → thème : une thématique pourra héberger **plusieurs
thèmes** plus tard (ex. Asiatique : Izakaya, puis un thème street-wok, un
sushi-bar…). Pour l'instant, un thème par catégorie. Ajouter un thème = un
nouveau `<slug>.html` + une entrée dans `data.js` + le catalogue prix de
`api/checkout.js`.

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

3. **Lien par client** : partager `https://<projet>.vercel.app/pizzeria`
   (ou `/fast-food`, `/food-truck`, `/poulet`, `/asiatique` — `cleanUrls`
   retire le `.html`), ou le showroom `https://<projet>.vercel.app/` pour
   laisser le prospect choisir.

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

Le contenu (marque, hero, plats, prix, photos, horaires) est dans
`assets/data.js`. Pour coller à un prospect précis, éditer l'entrée de sa
thématique. Le **design** de chaque thématique vit dans son `<slug>.html`
(mise en page propre) — c'est là qu'on ajuste la structure si besoin. Garder
les `id` d'articles alignés avec le catalogue de `api/checkout.js` (source
d'autorité des prix côté paiement).

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
