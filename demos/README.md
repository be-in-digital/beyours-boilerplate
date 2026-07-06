# Démos interactives — BeInDigital

Cinq **démos navigables** des univers de templates, une par vertical. Un
prospect ouvre le lien, parcourt la carte, ajoute au panier et va jusqu'au
**paiement en mode test Stripe** avec une carte de test. Objectif : vendre en
montrant le site réel qu'il aura, pas des captures.

```
demos/
  index.html          showroom : choix de l'univers
  store.html?t=<slug> boutique thémée (hero, carte, panier)
  checkout.html       récap + carte de test + bouton Payer
  success.html        confirmation
  assets/
    data.js           5 univers (tokens + polices + menu + photos)
    demo.css          styles 100 % pilotés par les tokens
    demo.js           rendu + panier + thème (store/checkout/success)
  api/checkout.js      fonction serverless : session Stripe Checkout (TEST)
  package.json         dépendance stripe (installée par Vercel)
  vercel.json          liens propres + noindex
```

Univers : `pizzeria`, `fast-food`, `food-truck`, `poulet`, `asiatique`.
Les couleurs et polices viennent des `templates/<slug>/theme.css` : une démo
est l'aperçu fidèle du site qu'un template produit **une fois le storefront
tokenisé** (voir la note « lien avec l'engine » plus bas).

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

3. **Lien par client** : partager `https://<projet>.vercel.app/store?t=pizzeria`
   (ou `t=fast-food`, `food-truck`, `poulet`, `asiatique`), ou le showroom
   `https://<projet>.vercel.app/` pour laisser le prospect choisir.

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

Tout est dans `assets/data.js` : marque, hero, catégories, plats, prix,
photos (id Unsplash), horaires. Pour coller à un prospect précis, dupliquer un
univers avec son nom et ses plats. Garder les `id` d'articles alignés avec le
catalogue de `api/checkout.js` (source d'autorité des prix côté paiement).

## Lien avec l'engine (important)

Ces démos sont **pilotées à 100 % par les tokens** (`hsl(var(--primary))`…).
C'est exactement le contrat que le **storefront de l'engine** devra suivre.
Aujourd'hui l'app engine code ses couleurs en dur (vert + orange) : appliquer
un template change les polices et le dashboard admin, mais pas les couleurs
des pages marketing. Ces démos sont donc à la fois un **outil de vente** et la
**cible de référence** pour la tâche engine « tokeniser le storefront » (après
quoi chaque vrai site EST sa démo, à ses couleurs).
