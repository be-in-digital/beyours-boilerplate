/*
 * Données des 5 univers de démo — BeInDigital.
 *
 * Chaque univers reprend les tokens de son template (templates/<slug>/theme.css)
 * + une paire de polices + un contenu réaliste (marque, hero, menu, photos).
 * C'est ce qui rend chaque démo authentique à son vertical.
 *
 * Les prix affichés ici sont indicatifs (démo). Le montant réellement débité
 * en test Stripe est recalculé côté serveur (api/checkout.js) à partir des
 * mêmes prix — garder les deux en phase.
 */
const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=800&q=80&auto=format&fit=crop`;

window.DEMOS = {
  /* ============================ PIZZERIA ============================ */
  pizzeria: {
    slug: "pizzeria",
    label: "Trattoria",
    brandPrefix: "Fuoco e ",
    brandWord: "Farina",
    fonts: { heading: "'Libre Bodoni', Georgia, serif", body: "'Figtree', system-ui, sans-serif", track: "-0.015em" },
    radius: "0.75rem",
    light: { "--background":"28 33% 97%","--foreground":"18 38% 12%","--card":"30 40% 99%","--primary":"14 68% 44%","--primary-foreground":"30 45% 98%","--secondary":"28 26% 92%","--secondary-foreground":"18 38% 14%","--muted":"28 26% 93%","--muted-foreground":"22 14% 40%","--accent":"14 58% 95%","--accent-foreground":"14 72% 27%","--border":"28 22% 87%","--ring":"14 68% 44%" },
    dark: { "--background":"20 24% 8%","--foreground":"30 28% 93%","--card":"20 22% 11%","--primary":"15 74% 58%","--primary-foreground":"20 45% 9%","--secondary":"22 16% 17%","--secondary-foreground":"30 28% 93%","--muted":"22 16% 17%","--muted-foreground":"28 14% 68%","--accent":"15 42% 16%","--accent-foreground":"18 75% 74%","--border":"22 16% 18%","--ring":"15 74% 58%" },
    nav: ["La carte", "Antipasti", "Chi siamo", "Nous trouver"],
    hero: {
      chip: "Napoli · Four à bois",
      title: "La pâte repose 48 heures, le feu fait le reste.",
      subtitle: "Farines italiennes, tomates San Marzano DOP, mozzarella fior di latte. Cuite en 90 secondes à 450 °C. À emporter ou livrée.",
      cta: "Voir la carte",
      rating: "4,8 / 5", ratingSub: "640 avis Google",
      image: IMG("1604382354936-07c5d9983bd3"),
    },
    cats: [
      { key: "all", label: "Toutes" },
      { key: "classiques", label: "Classiques" },
      { key: "blanches", label: "Blanches" },
      { key: "vegetariennes", label: "Végétariennes" },
      { key: "antipasti", label: "Antipasti" },
    ],
    menu: [
      { id: "pz1", name: "Margherita DOP", cat: "classiques", price: 12.5, desc: "San Marzano, fior di latte, basilic frais, huile du Cilento.", img: IMG("1574071318508-1cdbab80d002"), tag: "Signature" },
      { id: "pz2", name: "Diavola", cat: "classiques", price: 14, desc: "Spianata piquante, provola fumée, oignon rouge de Tropea.", img: IMG("1628840042765-356cda07504e") },
      { id: "pz3", name: "Bufala", cat: "classiques", price: 15.5, desc: "Mozzarella di bufala campana, tomates jaunes, roquette.", img: IMG("1595854341625-f33ee10dbf94") },
      { id: "pz4", name: "Quattro Formaggi", cat: "blanches", price: 15, desc: "Fior di latte, gorgonzola, pecorino, parmigiano 24 mois.", img: IMG("1513104890138-7c749659a591"), tag: "Blanche" },
      { id: "pz5", name: "Tartufo", cat: "blanches", price: 18, desc: "Crème de truffe, champignons, mozzarella, huile de truffe.", img: IMG("1571407970349-bc81e7e96d47") },
      { id: "pz6", name: "Ortolana", cat: "vegetariennes", price: 14.5, desc: "Légumes grillés, aubergine, courgette, poivron, basilic.", img: IMG("1520201163981-8cc95007dd2a"), tag: "Veggie" },
      { id: "pz7", name: "Marinara", cat: "vegetariennes", price: 10.5, desc: "San Marzano, ail, origan, huile d'olive. Sans fromage.", img: IMG("1571997478779-2adcbbe9ab2f") },
      { id: "pz8", name: "Burrata & jambon", cat: "antipasti", price: 11, desc: "Burrata des Pouilles, prosciutto di Parma 18 mois, focaccia.", img: IMG("1541014741259-de529411b96a"), tag: "Antipasti" },
    ],
    footer: { blurb: "Pizzeria napolitaine au feu de bois. Pâte au levain, maturation longue, produits DOP.", hours: ["Mar - Dim · 18 h 30 - 23 h", "Lundi · fermé"], address: ["14 rue des Lombards", "75004 Paris"], phone: "01 84 25 00 14" },
  },

  /* ============================ FAST-FOOD ============================ */
  "fast-food": {
    slug: "fast-food",
    label: "Smash",
    brandPrefix: "Le Comptoir ",
    brandWord: "Smash",
    fonts: { heading: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Archivo', system-ui, sans-serif", track: "-0.02em" },
    radius: "0.875rem",
    light: { "--background":"45 27% 97%","--foreground":"40 15% 9%","--card":"45 35% 99%","--primary":"40 18% 11%","--primary-foreground":"45 30% 97%","--secondary":"45 16% 92%","--secondary-foreground":"40 15% 10%","--muted":"45 16% 92%","--muted-foreground":"40 8% 40%","--accent":"44 85% 90%","--accent-foreground":"38 82% 24%","--border":"45 14% 86%","--ring":"40 18% 11%" },
    dark: { "--background":"40 12% 7%","--foreground":"45 20% 94%","--card":"40 11% 10%","--primary":"42 96% 54%","--primary-foreground":"40 30% 8%","--secondary":"40 9% 16%","--secondary-foreground":"45 20% 94%","--muted":"40 9% 16%","--muted-foreground":"44 10% 67%","--accent":"42 45% 14%","--accent-foreground":"45 92% 68%","--border":"40 9% 17%","--ring":"42 96% 54%" },
    nav: ["Menu", "Nos burgers", "Le lieu", "Nous trouver"],
    hero: {
      chip: "Bœuf français · Smashé minute",
      title: "Smashé à la commande, jamais avant.",
      subtitle: "Patties fines croustillantes, buns briochés maison, frites fraîches coupées du jour. Sur place ou à emporter.",
      cta: "Commander",
      rating: "4,7 / 5", ratingSub: "1 200 avis",
      image: IMG("1571091718767-18b5b1457add"),
    },
    cats: [
      { key: "all", label: "Tous" },
      { key: "burgers", label: "Burgers" },
      { key: "sides", label: "Accompagnements" },
    ],
    menu: [
      { id: "ff1", name: "Double Smash", cat: "burgers", price: 11.9, desc: "Deux patties smashées, cheddar affiné, pickles, sauce comptoir.", img: IMG("1607013251379-e6eecfffe234"), tag: "Best-seller" },
      { id: "ff2", name: "Classic Cheese", cat: "burgers", price: 9.9, desc: "Pattie smashée, cheddar fondu, oignons, ketchup-moutarde maison.", img: IMG("1568901346375-23c9450c58cd") },
      { id: "ff3", name: "Bacon Stack", cat: "burgers", price: 13.5, desc: "Double pattie, bacon fumé, cheddar, sauce BBQ maison.", img: IMG("1553979459-d2229ba7433b") },
      { id: "ff4", name: "Chicken Crisp", cat: "burgers", price: 11.5, desc: "Poulet pané croustillant, slaw, sauce ranch.", img: IMG("1606755962773-d324e0a13086") },
      { id: "ff5", name: "Veggie Smash", cat: "burgers", price: 10.9, desc: "Galette légumes-pois chiches, avocat, tomate, cheddar végétal.", img: IMG("1520072959219-c595dc870360"), tag: "Veggie" },
      { id: "ff6", name: "Frites maison", cat: "sides", price: 4.5, desc: "Coupées du jour, double cuisson, sel fumé.", img: IMG("1630384060421-cb20d0e0649d") },
      { id: "ff7", name: "Frites cheddar-bacon", cat: "sides", price: 6.5, desc: "Frites nappées de cheddar fondu, éclats de bacon, ciboule.", img: IMG("1573080496219-bb080dd4f877"), tag: "Loaded" },
    ],
    footer: { blurb: "Smash burgers premium. Viande française, buns briochés maison, frites fraîches.", hours: ["Lun - Dim · 11 h 30 - 23 h"], address: ["8 rue Oberkampf", "75011 Paris"], phone: "01 43 57 00 22" },
  },

  /* ============================ FOOD-TRUCK ============================ */
  "food-truck": {
    slug: "food-truck",
    label: "Convoi",
    brandPrefix: "La ",
    brandWord: "Remorque",
    fonts: { heading: "'Big Shoulders', system-ui, sans-serif", body: "'Work Sans', system-ui, sans-serif", track: "0.01em" },
    radius: "0.375rem",
    light: { "--background":"40 26% 96%","--foreground":"202 28% 13%","--card":"40 32% 98%","--primary":"192 62% 27%","--primary-foreground":"42 40% 97%","--secondary":"40 18% 90%","--secondary-foreground":"202 28% 14%","--muted":"40 18% 91%","--muted-foreground":"202 11% 38%","--accent":"192 38% 92%","--accent-foreground":"192 65% 19%","--border":"40 16% 85%","--ring":"192 62% 30%" },
    dark: { "--background":"202 30% 8%","--foreground":"40 22% 92%","--card":"202 26% 11%","--primary":"189 55% 47%","--primary-foreground":"203 40% 8%","--secondary":"202 20% 16%","--secondary-foreground":"40 22% 92%","--muted":"202 20% 16%","--muted-foreground":"202 12% 66%","--accent":"192 38% 15%","--accent-foreground":"188 55% 72%","--border":"202 20% 17%","--ring":"189 55% 47%" },
    nav: ["La carte", "Emplacements", "L'équipe", "Contact"],
    hero: {
      chip: "Cette semaine · Place du marché",
      title: "Aujourd'hui place du marché, demain gare du Sud.",
      subtitle: "Cuisine courte, produits du coin, tout est fait dans le camion. Commande et retrait au guichet.",
      cta: "Voir la carte",
      rating: "4,9 / 5", ratingSub: "310 avis",
      image: IMG("1552332386-f8dd00dc2f85"),
    },
    cats: [
      { key: "all", label: "Tout" },
      { key: "signatures", label: "Signatures" },
      { key: "veggie", label: "Veggie" },
      { key: "sides", label: "Accompagnements" },
    ],
    menu: [
      { id: "ft1", name: "Le Classique", cat: "signatures", price: 9.5, desc: "Effiloché de porc fermier, slaw croquant, pain vapeur.", img: IMG("1509722747041-616f39b57569"), tag: "Signature" },
      { id: "ft2", name: "Tacos bœuf braisé", cat: "signatures", price: 10, desc: "Bœuf braisé 6 h, oignons, cheddar, sauce chipotle.", img: IMG("1552332386-f8dd00dc2f85") },
      { id: "ft3", name: "Burrito poulet", cat: "signatures", price: 9.5, desc: "Poulet mariné, riz, haricots, guacamole, coriandre.", img: IMG("1626700051175-6818013e1d4f") },
      { id: "ft4", name: "Le Burger du camion", cat: "signatures", price: 11, desc: "Bœuf du coin, cheddar, oignons confits, cornichons.", img: IMG("1512152272829-e3139592d56f") },
      { id: "ft5", name: "Rouleaux végé", cat: "veggie", price: 7.5, desc: "Feuille de riz, crudités, herbes fraîches, sauce cacahuète.", img: IMG("1600850056064-a8b380df8395"), tag: "Veggie" },
      { id: "ft6", name: "Samoussas maison", cat: "veggie", price: 6, desc: "Légumes épicés, pâte croustillante, chutney mangue.", img: IMG("1601050690597-df0568f70950") },
      { id: "ft7", name: "Frites du convoi", cat: "sides", price: 4.5, desc: "Pommes de terre fraîches, herbes, fleur de sel.", img: IMG("1585109649139-366815a0d713") },
    ],
    footer: { blurb: "Cuisine de rue, faite dans le camion. Produits locaux, carte courte, emplacements qui bougent.", hours: ["Emplacements & horaires de la semaine sur Instagram"], address: ["Mar-Ven · midi", "Sam-Dim · midi & soir"], phone: "06 12 00 34 90" },
  },

  /* ============================ POULET ============================ */
  poulet: {
    slug: "poulet",
    label: "Braise",
    brandPrefix: "Master ",
    brandWord: "Poulet",
    fonts: { heading: "'Barlow Condensed', system-ui, sans-serif", body: "'Barlow', system-ui, sans-serif", track: "0.01em" },
    radius: "0.5rem",
    light: { "--background":"42 45% 97%","--foreground":"8 22% 11%","--card":"42 50% 99%","--primary":"355 70% 42%","--primary-foreground":"42 45% 97%","--secondary":"42 28% 92%","--secondary-foreground":"8 22% 12%","--muted":"42 28% 92%","--muted-foreground":"15 11% 40%","--accent":"355 58% 95%","--accent-foreground":"355 72% 28%","--border":"40 24% 87%","--ring":"355 70% 42%" },
    dark: { "--background":"8 16% 7%","--foreground":"40 30% 93%","--card":"8 14% 10%","--primary":"355 70% 50%","--primary-foreground":"42 45% 97%","--secondary":"10 10% 16%","--secondary-foreground":"40 30% 93%","--muted":"10 10% 16%","--muted-foreground":"30 12% 66%","--accent":"355 42% 15%","--accent-foreground":"355 80% 78%","--border":"10 10% 17%","--ring":"355 70% 52%" },
    nav: ["Menus", "Buckets", "Sauces", "Nous trouver"],
    hero: {
      chip: "Poulet fermier · Mariné 24 h",
      title: "Mariné 24 heures. Frit à la commande.",
      subtitle: "Panure croustillante, marinades maison, sauces signature. Sur place, à emporter ou livré.",
      cta: "Commander",
      rating: "4,8 / 5", ratingSub: "890 avis",
      image: IMG("1608039755401-742074f0548d"),
    },
    cats: [
      { key: "all", label: "Tout" },
      { key: "poulet", label: "Poulet" },
      { key: "burgers", label: "Burgers" },
      { key: "sides", label: "Accompagnements" },
    ],
    menu: [
      { id: "pl1", name: "Bucket 8 pièces", cat: "poulet", price: 16.9, desc: "Ailes et pilons marinés, deux sauces au choix.", img: IMG("1626645738196-c2a7c87a8f58"), tag: "À partager" },
      { id: "pl2", name: "Tenders ×5", cat: "poulet", price: 8.9, desc: "Filets croustillants, hot honey ou sauce blanche.", img: IMG("1562967914-608f82629710") },
      { id: "pl3", name: "Wings buffalo ×6", cat: "poulet", price: 7.5, desc: "Ailes glacées sauce buffalo, céleri, ranch maison.", img: IMG("1608039755401-742074f0548d"), tag: "Épicé" },
      { id: "pl4", name: "Hot honey wings", cat: "poulet", price: 8.5, desc: "Ailes croustillantes, miel piquant, graines de sésame.", img: IMG("1567620832903-9fc6debc209f") },
      { id: "pl5", name: "Poulet entier braisé", cat: "poulet", price: 14, desc: "Mariné 24 h, herbes, citron confit, braisé lentement.", img: IMG("1598103442097-8b74394b95c6") },
      { id: "pl6", name: "Burger Master", cat: "burgers", price: 10.9, desc: "Filet pané, cheddar, slaw, sauce signature, bun brioché.", img: IMG("1615297928064-24977384d0da"), tag: "Signature" },
      { id: "pl7", name: "Frites cajun", cat: "sides", price: 4.5, desc: "Frites épicées cajun, sauce fromagère.", img: IMG("1518013431117-eb1465fa5752") },
    ],
    footer: { blurb: "Poulet frit croustillant. Marinades maison, panure minute, sauces signature.", hours: ["Lun - Dim · 11 h - 23 h"], address: ["23 boulevard de Belleville", "75011 Paris"], phone: "01 46 00 78 51" },
  },

  /* ============================ ASIATIQUE ============================ */
  asiatique: {
    slug: "asiatique",
    label: "Izakaya",
    brandPrefix: "",
    brandWord: "Kōyō",
    fonts: { heading: "'Zen Kaku Gothic New', system-ui, sans-serif", body: "'Noto Sans', system-ui, sans-serif", track: "0.025em" },
    radius: "0.375rem",
    light: { "--background":"46 25% 97%","--foreground":"210 14% 11%","--card":"46 30% 99%","--primary":"168 46% 27%","--primary-foreground":"46 30% 97%","--secondary":"46 14% 92%","--secondary-foreground":"210 14% 12%","--muted":"46 14% 92%","--muted-foreground":"206 9% 40%","--accent":"168 30% 92%","--accent-foreground":"168 52% 19%","--border":"46 13% 87%","--ring":"168 46% 30%" },
    dark: { "--background":"210 20% 7%","--foreground":"46 18% 92%","--card":"210 17% 10%","--primary":"166 42% 46%","--primary-foreground":"210 30% 7%","--secondary":"210 14% 15%","--secondary-foreground":"46 18% 92%","--muted":"210 14% 15%","--muted-foreground":"210 10% 66%","--accent":"168 30% 14%","--accent-foreground":"165 45% 70%","--border":"210 14% 16%","--ring":"166 42% 46%" },
    nav: ["La carte", "Le comptoir", "Réserver", "Nous trouver"],
    hero: {
      chip: "Fait maison · Bouillon 12 h",
      title: "Le bouillon mijote depuis ce matin.",
      subtitle: "Ramen, donburi et petites assiettes, dressés au comptoir. Click & collect ou livraison.",
      cta: "Voir la carte",
      rating: "4,9 / 5", ratingSub: "540 avis",
      image: IMG("1617093727343-374698b1b08d"),
    },
    cats: [
      { key: "all", label: "Tout" },
      { key: "ramen", label: "Ramen" },
      { key: "bowls", label: "Bowls" },
      { key: "assiettes", label: "Petites assiettes" },
    ],
    menu: [
      { id: "as1", name: "Ramen shōyu", cat: "ramen", price: 13.5, desc: "Bouillon clair, chashu grillé, œuf mariné, nori, ciboule.", img: IMG("1569718212165-3a8278d5f624"), tag: "Signature" },
      { id: "as2", name: "Ramen tonkotsu", cat: "ramen", price: 14.5, desc: "Bouillon crémeux 12 h, porc effiloché, ail noir.", img: IMG("1617093727343-374698b1b08d") },
      { id: "as3", name: "Ramen végétarien", cat: "ramen", price: 12.5, desc: "Bouillon miso, tofu grillé, maïs, champignons, pousses.", img: IMG("1591814468924-caf88d1232e1"), tag: "Veggie" },
      { id: "as4", name: "Donburi saumon", cat: "bowls", price: 13, desc: "Saumon, avocat, edamame, riz vinaigré, sésame, ponzu.", img: IMG("1546069901-ba9599a7e63c") },
      { id: "as5", name: "Yakisoba", cat: "bowls", price: 12, desc: "Nouilles sautées, légumes croquants, sauce yakisoba.", img: IMG("1585032226651-759b368d7246") },
      { id: "as6", name: "Gyoza ×6", cat: "assiettes", price: 6.5, desc: "Porc et ciboule, plancha puis vapeur, ponzu maison.", img: IMG("1496116218417-1a781b1c416c") },
      { id: "as7", name: "Sushi mix ×12", cat: "assiettes", price: 14, desc: "Assortiment maki et nigiri, gingembre, wasabi.", img: IMG("1553621042-f6e147245754") },
    ],
    footer: { blurb: "Izakaya contemporain. Ramen, donburi et petites assiettes, dressés au comptoir.", hours: ["Mar - Dim · 12 h - 14 h 30 · 19 h - 22 h 30", "Lundi · fermé"], address: ["5 rue Sainte-Anne", "75001 Paris"], phone: "01 42 60 00 33" },
  },
};

window.DEMO_ORDER = ["pizzeria", "fast-food", "food-truck", "poulet", "asiatique"];
