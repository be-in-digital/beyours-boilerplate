/*
 * Catalogue des thèmes de démo BeYours — 10 thèmes par catégorie.
 *
 * Chaque thème = une IDENTITÉ complète : marque, palette clair/sombre,
 * paire de polices, formes (rayons, boutons, bordures), texture, et surtout
 * une COMBINAISON de familles de mise en page (hero, carte, nav, footer)
 * unique dans sa catégorie. Le contenu métier (plats, lieux, story) vient du
 * pack de la catégorie : c'est le design qui change, pas la cuisine.
 *
 * Champs thème :
 *   brand [préfixe, mot accentué] · tag (baseline) · fonts (clé PAIRINGS)
 *   radius/btn (pill|soft|square|brutal) · borderW · tex (none|dots|lines|grain|checker)
 *   nav (left|center|bar|minimal) · hero (editorial|fullbleed|poster|split|board|
 *   magazine|zen|banner|collage|duo) · menu (dotted|tickets|cards|zen|mosaic|
 *   ledger|tabs|bento) · foot (columns|center|heavy) · up (titres uppercase)
 *   orderBar (barre commande fixe) · locN (nb de lieux 1..3) · img (index photo hero)
 *   copy [titreHero, sousTitre] · L/D {bg fg p pf a af} (le reste est dérivé)
 *
 * IMPORTANT Stripe : les id de plats des packs correspondent aux catalogues de
 * api/checkout.js (source d'autorité des prix). Ne pas les changer.
 */
(function () {
  "use strict";
  const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

  /* ── Paires de polices (Google Fonts, vérifiées) ─────────────────────────── */
  const PAIRINGS = {
    bodoni:    { h: "'Libre Bodoni', Georgia, serif",            b: "'Figtree', system-ui, sans-serif",        css: "family=Libre+Bodoni:ital,wght@0,400..700;1,400..600&family=Figtree:wght@300..700" },
    bricolage: { h: "'Bricolage Grotesque', system-ui, sans-serif", b: "'Archivo', system-ui, sans-serif",     css: "family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Archivo:wght@400..800" },
    shoulders: { h: "'Big Shoulders', system-ui, sans-serif",     b: "'Work Sans', system-ui, sans-serif",     css: "family=Big+Shoulders:opsz,wght@10..72,500..900&family=Work+Sans:wght@400..700" },
    barlow:    { h: "'Barlow Condensed', system-ui, sans-serif",  b: "'Barlow', system-ui, sans-serif",        css: "family=Barlow+Condensed:wght@500;600;700;800;900&family=Barlow:wght@400;500;600;700" },
    zenkaku:   { h: "'Zen Kaku Gothic New', system-ui, sans-serif", b: "'Noto Sans', system-ui, sans-serif",   css: "family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=Noto+Sans:wght@300..700" },
    playfair:  { h: "'Playfair Display', Georgia, serif",         b: "'Public Sans', system-ui, sans-serif",   css: "family=Playfair+Display:ital,wght@0,400..900;1,400..700&family=Public+Sans:wght@300..700" },
    space:     { h: "'Space Grotesk', system-ui, sans-serif",     b: "'Karla', system-ui, sans-serif",         css: "family=Space+Grotesk:wght@400..700&family=Karla:wght@300..700" },
    oswald:    { h: "'Oswald', system-ui, sans-serif",            b: "'Onest', system-ui, sans-serif",         css: "family=Oswald:wght@400..700&family=Onest:wght@300..700" },
    bebas:     { h: "'Bebas Neue', system-ui, sans-serif",        b: "'Hanken Grotesk', system-ui, sans-serif", css: "family=Bebas+Neue&family=Hanken+Grotesk:wght@300..700" },
    marcellus: { h: "'Marcellus', Georgia, serif",                b: "'Albert Sans', system-ui, sans-serif",   css: "family=Marcellus&family=Albert+Sans:wght@300..700" },
    alfa:      { h: "'Alfa Slab One', Georgia, serif",            b: "'Epilogue', system-ui, sans-serif",      css: "family=Alfa+Slab+One&family=Epilogue:wght@300..700" },
    caslon:    { h: "'Libre Caslon Text', Georgia, serif",        b: "'Instrument Sans', system-ui, sans-serif", css: "family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Instrument+Sans:wght@400..700" },
    staat:     { h: "'Staatliches', system-ui, sans-serif",       b: "'Be Vietnam Pro', system-ui, sans-serif", css: "family=Staatliches&family=Be+Vietnam+Pro:wght@300;400;500;600;700" },
    sora:      { h: "'Sora', system-ui, sans-serif",              b: "'Manrope', system-ui, sans-serif",       css: "family=Sora:wght@400..800&family=Manrope:wght@300..800" },
    spartan:   { h: "'League Spartan', system-ui, sans-serif",    b: "'Inter Tight', system-ui, sans-serif",   css: "family=League+Spartan:wght@400..900&family=Inter+Tight:wght@300..700" },
    mincho:    { h: "'Shippori Mincho', Georgia, serif",          b: "'IBM Plex Sans', system-ui, sans-serif", css: "family=Shippori+Mincho:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300..700" },
    passion:   { h: "'Passion One', system-ui, sans-serif",       b: "'Gabarito', system-ui, sans-serif",      css: "family=Passion+One:wght@400;700;900&family=Gabarito:wght@400..800" },
    saira:     { h: "'Saira Condensed', system-ui, sans-serif",   b: "'Onest', system-ui, sans-serif",         css: "family=Saira+Condensed:wght@500;600;700;800;900&family=Onest:wght@300..700" },
    anton:     { h: "'Anton', system-ui, sans-serif",             b: "'Archivo Narrow', system-ui, sans-serif", css: "family=Anton&family=Archivo+Narrow:wght@400..700" },
    familjen:  { h: "'Familjen Grotesk', system-ui, sans-serif",  b: "'Karla', system-ui, sans-serif",         css: "family=Familjen+Grotesk:ital,wght@0,400..700;1,400..700&family=Karla:wght@300..700" },
    zenold:    { h: "'Zen Old Mincho', Georgia, serif",           b: "'Noto Sans', system-ui, sans-serif",     css: "family=Zen+Old+Mincho:wght@400;500;700;900&family=Noto+Sans:wght@300..700" },
    cormorant: { h: "'Cormorant Garamond', Georgia, serif",       b: "'Outfit', system-ui, sans-serif",        css: "family=Cormorant+Garamond:ital,wght@0,400..700;1,400..600&family=Outfit:wght@300..700" },
  };

  /* ── Packs de contenu par catégorie ──────────────────────────────────────── */
  const CATS = {
    pizzeria: {
      label: "Pizzeria",
      cats: [
        { key: "classiques", label: "Classiques" }, { key: "blanches", label: "Blanches" },
        { key: "vegetariennes", label: "Végétariennes" }, { key: "antipasti", label: "Antipasti" },
      ],
      dishes: [
        { id: "pz1", name: "Margherita DOP", cat: "classiques", price: 12.5, desc: "San Marzano, fior di latte, basilic frais, huile du Cilento.", img: IMG("1574071318508-1cdbab80d002"), tag: "Signature" },
        { id: "pz2", name: "Diavola", cat: "classiques", price: 14, desc: "Spianata piquante, provola fumée, oignon rouge de Tropea.", img: IMG("1628840042765-356cda07504e") },
        { id: "pz3", name: "Bufala", cat: "classiques", price: 15.5, desc: "Mozzarella di bufala campana, tomates jaunes, roquette.", img: IMG("1595854341625-f33ee10dbf94") },
        { id: "pz4", name: "Quattro Formaggi", cat: "blanches", price: 15, desc: "Fior di latte, gorgonzola, pecorino, parmigiano 24 mois.", img: IMG("1513104890138-7c749659a591") },
        { id: "pz5", name: "Tartufo", cat: "blanches", price: 18, desc: "Crème de truffe, champignons, mozzarella, huile de truffe.", img: IMG("1571407970349-bc81e7e96d47") },
        { id: "pz6", name: "Ortolana", cat: "vegetariennes", price: 14.5, desc: "Légumes grillés, aubergine, courgette, poivron, basilic.", img: IMG("1520201163981-8cc95007dd2a"), tag: "Veggie" },
        { id: "pz7", name: "Marinara", cat: "vegetariennes", price: 10.5, desc: "San Marzano, ail, origan, huile d'olive. Sans fromage.", img: IMG("1571997478779-2adcbbe9ab2f") },
        { id: "pz8", name: "Burrata & jambon", cat: "antipasti", price: 11, desc: "Burrata des Pouilles, prosciutto di Parma 18 mois, focaccia.", img: IMG("1541014741259-de529411b96a") },
      ],
      heroImgs: ["1604382354936-07c5d9983bd3", "1574071318508-1cdbab80d002", "1513104890138-7c749659a591", "1595854341625-f33ee10dbf94", "1628840042765-356cda07504e", "1571407970349-bc81e7e96d47"],
      galleryImgs: ["1604382354936-07c5d9983bd3", "1520201163981-8cc95007dd2a", "1541014741259-de529411b96a"],
      locations: [
        { id: "marais", name: "Le Marais", addr: "14 rue des Lombards, 75004 Paris", phone: "01 84 25 00 14", hours: "Mar - Dim · 18 h 30 - 23 h" },
        { id: "batignolles", name: "Batignolles", addr: "27 rue des Dames, 75017 Paris", phone: "01 84 25 00 15", hours: "Mer - Dim · 18 h 30 - 23 h" },
        { id: "vincennes", name: "Vincennes", addr: "3 avenue du Château, 94300 Vincennes", phone: "01 84 25 00 16", hours: "Jeu - Dim · 18 h 30 - 22 h 30" },
      ],
      story: {
        title: "Le four d'abord",
        text: [
          "Tout part du levain, rafraîchi chaque matin, et d'une pâte qui repose 48 heures avant de voir la flamme. Les tomates arrivent de Campanie, la mozzarella de la même laiterie depuis le premier jour.",
          "Le four monte à 450 °C. Chaque pizza y passe environ 90 secondes : la croûte gonfle, se marque, et sort quand elle est prête. Pas avant, pas après.",
        ],
        quote: "On ne triche pas avec le feu. La braise monte, la pâte gonfle, chaque pizza sort en une minute trente.",
        sig: "Le pizzaiolo",
      },
      email: "ciao@demo-pizzeria.fr",
    },

    "fast-food": {
      label: "Fast-food",
      cats: [{ key: "burgers", label: "Burgers" }, { key: "sides", label: "Accompagnements" }],
      dishes: [
        { id: "ff1", name: "Double Smash", cat: "burgers", price: 11.9, desc: "Deux patties smashées, cheddar affiné, pickles, sauce maison.", img: IMG("1607013251379-e6eecfffe234"), tag: "Best-seller" },
        { id: "ff2", name: "Classic Cheese", cat: "burgers", price: 9.9, desc: "Pattie smashée, cheddar fondu, oignons, ketchup-moutarde.", img: IMG("1568901346375-23c9450c58cd") },
        { id: "ff3", name: "Bacon Stack", cat: "burgers", price: 13.5, desc: "Double pattie, bacon fumé, cheddar, sauce BBQ maison.", img: IMG("1553979459-d2229ba7433b") },
        { id: "ff4", name: "Chicken Crisp", cat: "burgers", price: 11.5, desc: "Poulet pané croustillant, slaw, sauce ranch.", img: IMG("1606755962773-d324e0a13086") },
        { id: "ff5", name: "Veggie Smash", cat: "burgers", price: 10.9, desc: "Galette légumes-pois chiches, avocat, tomate, cheddar végétal.", img: IMG("1520072959219-c595dc870360"), tag: "Veggie" },
        { id: "ff6", name: "Frites maison", cat: "sides", price: 4.5, desc: "Coupées du jour, double cuisson, sel fumé.", img: IMG("1630384060421-cb20d0e0649d") },
        { id: "ff7", name: "Frites cheddar-bacon", cat: "sides", price: 6.5, desc: "Nappées de cheddar fondu, éclats de bacon, ciboule.", img: IMG("1573080496219-bb080dd4f877") },
      ],
      heroImgs: ["1571091718767-18b5b1457add", "1607013251379-e6eecfffe234", "1568901346375-23c9450c58cd", "1550547660-d9450f859349", "1553979459-d2229ba7433b", "1572802419224-296b0aeee0d9", "1610614819513-58e34989848b", "1520072959219-c595dc870360"],
      galleryImgs: ["1610614819513-58e34989848b", "1630384060421-cb20d0e0649d", "1550547660-d9450f859349"],
      locations: [
        { id: "oberkampf", name: "Oberkampf", addr: "8 rue Oberkampf, 75011 Paris", phone: "01 43 57 00 22", hours: "Lun - Dim · 11 h 30 - 23 h" },
        { id: "montorgueil", name: "Montorgueil", addr: "52 rue Montorgueil, 75002 Paris", phone: "01 43 57 00 23", hours: "Lun - Dim · 11 h 30 - 23 h 30" },
        { id: "levallois", name: "Levallois", addr: "90 rue du Président Wilson, 92300 Levallois", phone: "01 43 57 00 24", hours: "Lun - Sam · 11 h 30 - 22 h 30" },
      ],
      story: {
        title: "Le smash, au sérieux",
        text: [
          "Une boule de bœuf français pressée sur plancha brûlante : la croûte caramélise, le cœur reste juteux. C'est toute la différence entre un burger cuit et un burger smashé.",
          "Les buns sont pétris et dorés chaque matin, les frites coupées du jour, les sauces montées à la main. Rien ne sort du surgélateur.",
        ],
        quote: "La plancha ne pardonne rien : trente secondes de trop et tout est sec. C'est pour ça qu'on smashe à la commande.",
        sig: "L'équipe du comptoir",
      },
      email: "hello@demo-smash.fr",
    },

    "food-truck": {
      label: "Food truck",
      cats: [{ key: "signatures", label: "Signatures" }, { key: "veggie", label: "Veggie" }, { key: "sides", label: "À côté" }],
      dishes: [
        { id: "ft1", name: "Le Classique", cat: "signatures", price: 9.5, desc: "Effiloché de porc fermier, slaw croquant, pain vapeur.", img: IMG("1509722747041-616f39b57569"), tag: "Signature" },
        { id: "ft2", name: "Tacos bœuf braisé", cat: "signatures", price: 10, desc: "Bœuf braisé 6 h, oignons, cheddar, sauce chipotle.", img: IMG("1552332386-f8dd00dc2f85") },
        { id: "ft3", name: "Burrito poulet", cat: "signatures", price: 9.5, desc: "Poulet mariné, riz, haricots, guacamole, coriandre.", img: IMG("1626700051175-6818013e1d4f") },
        { id: "ft4", name: "Le Burger du camion", cat: "signatures", price: 11, desc: "Bœuf du coin, cheddar, oignons confits, cornichons.", img: IMG("1512152272829-e3139592d56f") },
        { id: "ft5", name: "Rouleaux végé", cat: "veggie", price: 7.5, desc: "Feuille de riz, crudités, herbes fraîches, sauce cacahuète.", img: IMG("1600850056064-a8b380df8395"), tag: "Veggie" },
        { id: "ft6", name: "Samoussas maison", cat: "veggie", price: 6, desc: "Légumes épicés, pâte croustillante, chutney mangue.", img: IMG("1601050690597-df0568f70950") },
        { id: "ft7", name: "Frites du convoi", cat: "sides", price: 4.5, desc: "Pommes de terre fraîches, herbes, fleur de sel.", img: IMG("1585109649139-366815a0d713") },
      ],
      heroImgs: ["1552332386-f8dd00dc2f85", "1509722747041-616f39b57569", "1626700051175-6818013e1d4f", "1512152272829-e3139592d56f", "1600850056064-a8b380df8395", "1601050690597-df0568f70950"],
      galleryImgs: ["1509722747041-616f39b57569", "1600850056064-a8b380df8395", "1585109649139-366815a0d713"],
      // Un camion : les « lieux » sont des emplacements de la semaine.
      locations: [
        { id: "bastille", name: "Marché Bastille", addr: "Boulevard Richard Lenoir, 75011 Paris", phone: "06 12 00 34 90", hours: "Lun & Mer · 11 h 30 - 14 h" },
        { id: "garedusud", name: "Gare du Sud", addr: "Parvis de la gare, 75014 Paris", phone: "06 12 00 34 90", hours: "Mar & Jeu · 18 h - 22 h" },
        { id: "villette", name: "Parc de la Villette", addr: "211 avenue Jean Jaurès, 75019 Paris", phone: "06 12 00 34 90", hours: "Ven - Dim · 18 h - 23 h" },
      ],
      story: {
        title: "La route fait le menu",
        text: [
          "Un camion, deux planchas, une carte courte qui change avec les saisons et les producteurs croisés sur la route. Tout est préparé dedans, du matin au service.",
          "On s'installe là où ça vit : marchés, parvis, parcs. L'emplacement du jour est toujours annoncé ici et sur nos réseaux.",
        ],
        quote: "Une petite cuisine qui bouge, ça oblige à faire simple et bon. Le reste, c'est du bruit.",
        sig: "Le chef du camion",
      },
      email: "coucou@demo-remorque.fr",
    },

    poulet: {
      label: "Poulet",
      cats: [{ key: "poulet", label: "Poulet" }, { key: "burgers", label: "Burgers" }, { key: "sides", label: "Accompagnements" }],
      dishes: [
        { id: "pl1", name: "Bucket 8 pièces", cat: "poulet", price: 16.9, desc: "Ailes et pilons marinés, deux sauces au choix.", img: IMG("1626645738196-c2a7c87a8f58"), tag: "À partager" },
        { id: "pl2", name: "Tenders ×5", cat: "poulet", price: 8.9, desc: "Filets croustillants, hot honey ou sauce blanche.", img: IMG("1562967914-608f82629710") },
        { id: "pl3", name: "Wings buffalo ×6", cat: "poulet", price: 7.5, desc: "Ailes glacées sauce buffalo, céleri, ranch maison.", img: IMG("1608039755401-742074f0548d"), tag: "Épicé" },
        { id: "pl4", name: "Hot honey wings", cat: "poulet", price: 8.5, desc: "Ailes croustillantes, miel piquant, sésame.", img: IMG("1567620832903-9fc6debc209f") },
        { id: "pl5", name: "Poulet entier braisé", cat: "poulet", price: 14, desc: "Mariné 24 h, herbes, citron confit, braisé lentement.", img: IMG("1598103442097-8b74394b95c6") },
        { id: "pl6", name: "Burger Master", cat: "burgers", price: 10.9, desc: "Filet pané, cheddar, slaw, sauce signature, bun brioché.", img: IMG("1615297928064-24977384d0da"), tag: "Signature" },
        { id: "pl7", name: "Frites cajun", cat: "sides", price: 4.5, desc: "Frites épicées cajun, sauce fromagère.", img: IMG("1518013431117-eb1465fa5752") },
      ],
      heroImgs: ["1608039755401-742074f0548d", "1626645738196-c2a7c87a8f58", "1598103442097-8b74394b95c6", "1562967914-608f82629710", "1615297928064-24977384d0da", "1567620832903-9fc6debc209f"],
      galleryImgs: ["1626645738196-c2a7c87a8f58", "1567620832903-9fc6debc209f", "1518013431117-eb1465fa5752"],
      locations: [
        { id: "belleville", name: "Belleville", addr: "23 boulevard de Belleville, 75011 Paris", phone: "01 46 00 78 51", hours: "Lun - Dim · 11 h - 23 h" },
        { id: "chatelet", name: "Châtelet", addr: "6 rue des Halles, 75001 Paris", phone: "01 46 00 78 52", hours: "Lun - Dim · 11 h - minuit" },
        { id: "saintdenis", name: "Saint-Denis", addr: "2 place du 8 Mai 1945, 93200 Saint-Denis", phone: "01 46 00 78 53", hours: "Mar - Dim · 11 h 30 - 22 h 30" },
      ],
      story: {
        title: "Mariné, pané, frit minute",
        text: [
          "Le poulet passe 24 heures dans une marinade au babeurre et aux épices avant d'être pané à la commande. La friture est courte, la panure craque, la chair reste moelleuse.",
          "Les sauces sont maison, du hot honey au ranch, et les buckets sont pensés pour les tablées : on partage, on compare, on y retourne.",
        ],
        quote: "Le secret n'est pas dans la friteuse, il est dans les 24 heures qui la précèdent.",
        sig: "La maison",
      },
      email: "bonjour@demo-poulet.fr",
    },

    asiatique: {
      label: "Asiatique",
      cats: [{ key: "ramen", label: "Ramen" }, { key: "bowls", label: "Donburi & bowls" }, { key: "assiettes", label: "Petites assiettes" }],
      dishes: [
        { id: "as1", name: "Ramen shōyu", cat: "ramen", price: 13.5, desc: "Bouillon clair, chashu grillé, œuf mariné, nori, ciboule.", img: IMG("1569718212165-3a8278d5f624"), tag: "Signature" },
        { id: "as2", name: "Ramen tonkotsu", cat: "ramen", price: 14.5, desc: "Bouillon crémeux 12 h, porc effiloché, ail noir.", img: IMG("1617093727343-374698b1b08d") },
        { id: "as3", name: "Ramen végétarien", cat: "ramen", price: 12.5, desc: "Bouillon miso, tofu grillé, maïs, champignons, pousses.", img: IMG("1591814468924-caf88d1232e1"), tag: "Veggie" },
        { id: "as4", name: "Donburi saumon", cat: "bowls", price: 13, desc: "Saumon, avocat, edamame, riz vinaigré, sésame, ponzu.", img: IMG("1546069901-ba9599a7e63c") },
        { id: "as5", name: "Yakisoba", cat: "bowls", price: 12, desc: "Nouilles sautées, légumes croquants, sauce yakisoba.", img: IMG("1585032226651-759b368d7246") },
        { id: "as6", name: "Gyoza ×6", cat: "assiettes", price: 6.5, desc: "Porc et ciboule, plancha puis vapeur, ponzu maison.", img: IMG("1496116218417-1a781b1c416c") },
        { id: "as7", name: "Sushi mix ×12", cat: "assiettes", price: 14, desc: "Assortiment maki et nigiri, gingembre, wasabi.", img: IMG("1553621042-f6e147245754") },
      ],
      heroImgs: ["1617093727343-374698b1b08d", "1569718212165-3a8278d5f624", "1553621042-f6e147245754", "1546069901-ba9599a7e63c", "1585032226651-759b368d7246", "1591814468924-caf88d1232e1"],
      galleryImgs: ["1496116218417-1a781b1c416c", "1546069901-ba9599a7e63c", "1631206753348-db44968fd440"],
      locations: [
        { id: "sainteanne", name: "Sainte-Anne", addr: "5 rue Sainte-Anne, 75001 Paris", phone: "01 42 60 00 33", hours: "Mar - Dim · 12 h - 14 h 30 · 19 h - 22 h 30" },
        { id: "canal", name: "Canal Saint-Martin", addr: "88 quai de Jemmapes, 75010 Paris", phone: "01 42 60 00 34", hours: "Mer - Dim · 12 h - 15 h · 19 h - 23 h" },
        { id: "croixrousse", name: "Lyon Croix-Rousse", addr: "12 rue du Mail, 69004 Lyon", phone: "04 72 00 00 35", hours: "Mar - Sam · 12 h - 14 h · 19 h - 22 h" },
      ],
      story: {
        title: "Douze heures de bouillon",
        text: [
          "Le tonkotsu démarre à l'aube et mijote douze heures. Les nouilles arrivent d'un petit atelier, les légumes du marché, et tout se dresse à la minute, au comptoir.",
          "La carte est courte parce que chaque plat demande du temps. On préfère peu de choses, faites avec soin.",
        ],
        quote: "Douze heures pour un bouillon. Le reste se joue à la minute, devant vous.",
        sig: "Le comptoir",
      },
      email: "irasshai@demo-izakaya.fr",
    },
  };

  /* ── Les 50 thèmes ───────────────────────────────────────────────────────── */
  const T = [];
  const def = (cat, id, name, o) => T.push(Object.assign({ id: `${cat}-${id}`, cat, name }, o));

  /* ---------- PIZZERIA (10) ---------- */
  def("pizzeria", "trattoria", "Trattoria", {
    brand: ["Fuoco e ", "Farina"], tag: "Napolitaine au feu de bois",
    fonts: "bodoni", radius: ".75rem", btn: "pill", borderW: 1, tex: "none",
    nav: "left", hero: "editorial", menu: "dotted", foot: "columns", up: 0, locN: 2, img: 0,
    copy: ["La pâte repose 48 heures, le feu fait le reste.", "Farines italiennes, San Marzano DOP, fior di latte. Cuite en 90 secondes à 450 °C."],
    L: { bg: "28 33% 97%", fg: "18 38% 12%", p: "14 68% 44%", pf: "30 45% 98%", a: "14 58% 95%", af: "14 72% 27%" },
    D: { bg: "20 24% 8%", fg: "30 28% 93%", p: "15 74% 58%", pf: "20 45% 9%", a: "15 42% 16%", af: "18 75% 74%" },
  });
  def("pizzeria", "verace", "Verace", {
    brand: ["", "Verace"], tag: "Pizza napolitaine, basta",
    fonts: "familjen", radius: ".25rem", btn: "underline", borderW: 1, tex: "none",
    nav: "minimal", hero: "zen", menu: "zen", foot: "center", up: 0, locN: 1, img: 3,
    copy: ["Quatre pizzas. Un four. C'est tout.", "Une carte volontairement courte : ce que le four sait faire parfaitement, rien d'autre."],
    L: { bg: "80 18% 97%", fg: "140 25% 12%", p: "145 45% 26%", pf: "80 25% 97%", a: "145 30% 92%", af: "145 50% 19%" },
    D: { bg: "150 15% 8%", fg: "80 15% 92%", p: "140 35% 55%", pf: "150 25% 8%", a: "145 25% 15%", af: "140 40% 72%" },
  });
  def("pizzeria", "fornonero", "Forno Nero", {
    brand: ["Forno ", "Nero"], tag: "Braise, cendre et farine",
    fonts: "space", radius: "0rem", btn: "square", borderW: 2, tex: "grain",
    nav: "bar", hero: "duo", menu: "ledger", foot: "heavy", up: 1, locN: 2, img: 4, darkFirst: 1,
    copy: ["Cuit dans le noir, servi brûlant.", "Un four noir, une salle sombre, des pizzas qui claquent. Le reste est superflu."],
    L: { bg: "40 12% 94%", fg: "30 10% 8%", p: "24 90% 36%", pf: "40 30% 96%", a: "28 60% 90%", af: "28 80% 26%" },
    D: { bg: "30 10% 6%", fg: "40 18% 90%", p: "28 92% 54%", pf: "30 30% 6%", a: "28 40% 13%", af: "32 85% 70%" },
  });
  def("pizzeria", "milano", "Milano", {
    brand: ["Pizzeria ", "Milano"], tag: "Éditoriale, comme un magazine",
    fonts: "playfair", radius: ".125rem", btn: "underline", borderW: 1, tex: "lines",
    nav: "center", hero: "magazine", menu: "mosaic", foot: "center", up: 0, locN: 3, img: 1,
    copy: ["La pizza, traitée comme une couverture.", "Produits de saison, pâte longue fermentation, dressage précis. Milan dans l'assiette."],
    L: { bg: "0 0% 98%", fg: "0 0% 8%", p: "352 78% 40%", pf: "0 0% 98%", a: "352 45% 94%", af: "352 75% 27%" },
    D: { bg: "0 0% 7%", fg: "0 0% 94%", p: "352 75% 61%", pf: "0 0% 10%", a: "352 35% 15%", af: "352 70% 76%" },
  });
  def("pizzeria", "golfo", "Golfo", {
    brand: ["Il ", "Golfo"], tag: "La côte amalfitaine à table",
    fonts: "marcellus", radius: "1rem", btn: "pill", borderW: 1, tex: "none",
    nav: "center", hero: "collage", menu: "cards", foot: "columns", up: 0, locN: 2, img: 2,
    copy: ["Citron, mer et pâte dorée.", "Une pizzeria qui sent l'été italien : produits du golfe, citrons de Sorrente, houle légère."],
    L: { bg: "48 45% 96%", fg: "215 45% 15%", p: "210 65% 38%", pf: "48 50% 96%", a: "48 75% 88%", af: "40 70% 25%" },
    D: { bg: "215 40% 9%", fg: "48 35% 92%", p: "205 60% 55%", pf: "215 45% 8%", a: "210 40% 16%", af: "205 55% 74%" },
  });
  def("pizzeria", "rustica", "Rustica", {
    brand: ["", "Rustica"], tag: "Pizzeria de campagne",
    fonts: "caslon", radius: ".375rem", btn: "soft", borderW: 2, tex: "dots",
    nav: "left", hero: "split", menu: "tickets", foot: "columns", up: 0, locN: 1, img: 5,
    copy: ["Une ferme, un four, une table.", "Légumes du potager, farines de meule, feu de chêne. La pizza comme à la campagne."],
    L: { bg: "42 38% 95%", fg: "28 30% 14%", p: "18 55% 38%", pf: "42 45% 96%", a: "80 30% 90%", af: "90 35% 22%" },
    D: { bg: "28 22% 9%", fg: "42 30% 92%", p: "20 60% 55%", pf: "28 30% 8%", a: "85 20% 15%", af: "85 30% 70%" },
  });
  def("pizzeria", "doppiozero", "Doppio Zero", {
    brand: ["Doppio ", "Zero"], tag: "Farine 00, design 0 fioriture",
    fonts: "sora", radius: ".125rem", btn: "square", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "ledger", foot: "center", up: 0, locN: 2, img: 3,
    copy: ["00. La farine. Le reste suit.", "Une carte nette, un service rapide, zéro décor inutile. La pizza en circuit court."],
    L: { bg: "0 0% 99%", fg: "240 8% 10%", p: "240 8% 12%", pf: "0 0% 98%", a: "4 80% 94%", af: "4 75% 32%" },
    D: { bg: "240 8% 7%", fg: "0 0% 94%", p: "4 78% 58%", pf: "240 8% 8%", a: "240 6% 15%", af: "4 80% 76%" },
  });
  def("pizzeria", "vesuvio", "Vesuvio", {
    brand: ["", "Vesuvio"], tag: "La pizza qui gronde",
    fonts: "anton", radius: ".25rem", btn: "brutal", borderW: 3, tex: "none",
    nav: "bar", hero: "poster", menu: "bento", foot: "heavy", up: 1, locN: 3, img: 4,
    copy: ["ÇA VA ÉRUPTER.", "Pizzas généreuses, piquant assumé, four qui ne refroidit jamais. Attention aux coulées."],
    L: { bg: "45 60% 96%", fg: "0 0% 9%", p: "0 78% 44%", pf: "45 80% 96%", a: "45 90% 88%", af: "20 80% 25%" },
    D: { bg: "0 0% 7%", fg: "45 40% 93%", p: "0 80% 58%", pf: "0 0% 8%", a: "0 45% 14%", af: "0 75% 76%" },
  });
  def("pizzeria", "basilico", "Basilico", {
    brand: ["Casa ", "Basilico"], tag: "Verte, fraîche, végétale",
    fonts: "gabaritoLike", radius: "1.25rem", btn: "pill", borderW: 1, tex: "none",
    nav: "left", hero: "fullbleed", menu: "cards", foot: "columns", up: 0, locN: 2, img: 2,
    copy: ["Le basilic d'abord, la mozzarella ensuite.", "Une pizzeria à dominante végétale : herbes fraîches, légumes rôtis, huiles parfumées."],
    L: { bg: "90 30% 97%", fg: "120 30% 12%", p: "120 40% 30%", pf: "90 40% 97%", a: "90 45% 90%", af: "120 45% 20%" },
    D: { bg: "120 20% 8%", fg: "90 25% 92%", p: "110 35% 52%", pf: "120 30% 8%", a: "115 25% 14%", af: "100 40% 72%" },
  });
  def("pizzeria", "notte", "Notte", {
    brand: ["Pizza ", "Notte"], tag: "La part de nuit",
    fonts: "bricolage", radius: ".625rem", btn: "soft", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "tabs", foot: "center", up: 0, locN: 3, img: 5, darkFirst: 1, orderBar: 1,
    copy: ["Ouvert quand les autres dorment.", "Pizzas à la part et entières, jusqu'à 2 h du matin. Commande en ligne, retrait éclair."],
    L: { bg: "260 20% 97%", fg: "262 30% 12%", p: "262 60% 45%", pf: "260 30% 98%", a: "262 45% 93%", af: "262 60% 30%" },
    D: { bg: "258 28% 8%", fg: "260 20% 93%", p: "265 70% 68%", pf: "260 35% 8%", a: "262 35% 16%", af: "265 65% 82%" },
  });

  /* ---------- FAST-FOOD (10) ---------- */
  def("fast-food", "smash", "Smash", {
    brand: ["Le Comptoir ", "Smash"], tag: "Smashé minute, jamais avant",
    fonts: "bricolage", radius: ".875rem", btn: "soft", borderW: 2, tex: "none",
    nav: "left", hero: "split", menu: "tabs", foot: "columns", up: 1, locN: 2, img: 0, orderBar: 1,
    copy: ["Smashé à la commande, jamais avant.", "Patties fines croustillantes, buns briochés maison, frites fraîches coupées du jour."],
    L: { bg: "45 27% 97%", fg: "40 15% 9%", p: "40 18% 11%", pf: "45 30% 97%", a: "44 85% 90%", af: "38 82% 24%" },
    D: { bg: "40 12% 7%", fg: "45 20% 94%", p: "42 96% 54%", pf: "40 30% 8%", a: "42 45% 14%", af: "45 92% 68%" },
  });
  def("fast-food", "dinerclassic", "Diner 56", {
    brand: ["Diner ", "56"], tag: "Le diner américain, version 2026",
    fonts: "alfa", radius: "1.25rem", btn: "pill", borderW: 2, tex: "checker",
    nav: "center", hero: "collage", menu: "cards", foot: "columns", up: 0, locN: 2, img: 3,
    copy: ["Milkshakes, néons et double cheese.", "Banquettes, chrome et burgers généreux : le diner de quartier, sans l'avion à prendre."],
    L: { bg: "160 30% 96%", fg: "200 30% 12%", p: "350 75% 45%", pf: "160 40% 97%", a: "160 45% 88%", af: "170 45% 20%" },
    D: { bg: "205 30% 9%", fg: "160 20% 93%", p: "350 80% 60%", pf: "200 30% 9%", a: "170 30% 15%", af: "165 45% 70%" },
  });
  def("fast-food", "grill77", "Grill 77", {
    brand: ["Grill ", "77"], tag: "Charbon, flamme, point.",
    fonts: "oswald", radius: ".25rem", btn: "square", borderW: 2, tex: "grain",
    nav: "bar", hero: "fullbleed", menu: "ledger", foot: "heavy", up: 1, locN: 1, img: 4, darkFirst: 1,
    copy: ["Passé à la flamme, pas à la mode.", "Grillades au charbon, pain toasté au gras de bœuf, sauces brutes. Un grill, pas un concept."],
    L: { bg: "30 15% 95%", fg: "20 15% 9%", p: "20 85% 36%", pf: "30 25% 96%", a: "20 55% 91%", af: "20 75% 26%" },
    D: { bg: "20 12% 6%", fg: "30 15% 92%", p: "22 88% 52%", pf: "20 25% 6%", a: "20 40% 13%", af: "24 80% 72%" },
  });
  def("fast-food", "verte", "La Verte", {
    brand: ["La ", "Verte"], tag: "Fast-food, bonne conscience",
    fonts: "sora", radius: "1.5rem", btn: "pill", borderW: 1, tex: "none",
    nav: "left", hero: "zen", menu: "cards", foot: "center", up: 0, locN: 3, img: 5,
    copy: ["Rapide ne veut pas dire n'importe quoi.", "Burgers végétaux et poulet fermier, légumes de saison, emballages compostables."],
    L: { bg: "70 35% 97%", fg: "150 30% 12%", p: "150 45% 30%", pf: "70 40% 97%", a: "70 50% 90%", af: "95 45% 22%" },
    D: { bg: "150 22% 8%", fg: "70 25% 92%", p: "140 40% 52%", pf: "150 30% 8%", a: "145 25% 14%", af: "120 35% 72%" },
  });
  def("fast-food", "boxx", "BOXX", {
    brand: ["", "BOXX"], tag: "Burgers en boîte, design en briques",
    fonts: "spartan", radius: "0rem", btn: "brutal", borderW: 3, tex: "none",
    nav: "bar", hero: "poster", menu: "bento", foot: "heavy", up: 1, locN: 2, img: 1, orderBar: 1,
    copy: ["DANS LA BOÎTE.", "Un menu carré : quatre burgers, deux frites, zéro hésitation. Tu commandes, ça sort."],
    L: { bg: "50 100% 96%", fg: "0 0% 7%", p: "0 0% 9%", pf: "52 100% 62%", a: "52 96% 85%", af: "40 60% 18%" },
    D: { bg: "0 0% 7%", fg: "50 60% 94%", p: "52 96% 56%", pf: "0 0% 8%", a: "50 40% 14%", af: "52 90% 72%" },
  });
  def("fast-food", "minuit", "Minuit", {
    brand: ["Burger ", "Minuit"], tag: "Le burger d'après la fête",
    fonts: "space", radius: ".75rem", btn: "soft", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "tabs", foot: "center", up: 0, locN: 3, img: 6, darkFirst: 1, orderBar: 1,
    copy: ["Ouvert tard, très tard.", "Commande en trois gestes, retrait au comptoir en dix minutes. La nuit a son burger."],
    L: { bg: "250 25% 97%", fg: "255 30% 12%", p: "270 60% 48%", pf: "250 40% 98%", a: "270 45% 93%", af: "270 55% 32%" },
    D: { bg: "255 30% 7%", fg: "250 20% 93%", p: "275 75% 70%", pf: "255 40% 8%", a: "270 35% 15%", af: "280 70% 82%" },
  });
  def("fast-food", "fermier", "Le Fermier", {
    brand: ["Le ", "Fermier"], tag: "Du champ au bun",
    fonts: "caslon", radius: ".5rem", btn: "soft", borderW: 2, tex: "dots",
    nav: "left", hero: "split", menu: "tickets", foot: "columns", up: 0, locN: 1, img: 7,
    copy: ["Nos vaches ont un prénom.", "Bœuf d'un seul élevage, légumes de plein champ, fromages fermiers. Le burger en circuit court."],
    L: { bg: "45 35% 96%", fg: "25 30% 13%", p: "355 55% 40%", pf: "45 45% 96%", a: "45 55% 89%", af: "30 55% 24%" },
    D: { bg: "25 20% 8%", fg: "45 28% 92%", p: "355 60% 59%", pf: "25 30% 8%", a: "30 30% 14%", af: "40 55% 72%" },
  });
  def("fast-food", "stacked", "Stacked", {
    brand: ["", "Stacked"], tag: "Le burger en une",
    fonts: "playfair", radius: ".125rem", btn: "underline", borderW: 1, tex: "lines",
    nav: "center", hero: "magazine", menu: "mosaic", foot: "center", up: 0, locN: 2, img: 2,
    copy: ["Le burger mérite sa une.", "Recettes construites comme des couvertures : équilibre, contraste, une pointe d'audace."],
    L: { bg: "0 0% 98%", fg: "220 15% 10%", p: "220 90% 50%", pf: "0 0% 100%", a: "220 60% 94%", af: "220 80% 32%" },
    D: { bg: "222 18% 8%", fg: "0 0% 94%", p: "215 90% 62%", pf: "222 30% 8%", a: "220 40% 16%", af: "215 80% 78%" },
  });
  def("fast-food", "drivein", "Drive-In", {
    brand: ["", "Drive-In"], tag: "Commande roulante depuis 1987",
    fonts: "passion", radius: "1rem", btn: "pill", borderW: 2, tex: "none",
    nav: "center", hero: "board", menu: "cards", foot: "columns", up: 0, locN: 3, img: 3,
    copy: ["Klaxonne, on arrive.", "Le drive à l'ancienne : plateau accroché à la vitre, frites brûlantes, sodas glacés."],
    L: { bg: "200 45% 96%", fg: "215 40% 13%", p: "205 80% 40%", pf: "200 60% 97%", a: "35 90% 88%", af: "30 80% 27%" },
    D: { bg: "215 35% 8%", fg: "200 30% 93%", p: "203 75% 55%", pf: "215 45% 8%", a: "210 35% 15%", af: "200 65% 75%" },
  });
  def("fast-food", "prime", "Prime", {
    brand: ["", "Prime"], tag: "Le burger de boucher",
    fonts: "cormorant", radius: ".375rem", btn: "square", borderW: 1, tex: "none",
    nav: "center", hero: "duo", menu: "ledger", foot: "center", up: 0, locN: 1, img: 4, darkFirst: 1,
    copy: ["Race à viande, main de boucher.", "Maturation lente, cuisson précise, carte courte. Le burger traité comme une pièce de bœuf."],
    L: { bg: "35 20% 95%", fg: "25 25% 10%", p: "30 45% 32%", pf: "35 35% 96%", a: "35 35% 89%", af: "28 45% 22%" },
    D: { bg: "24 18% 7%", fg: "35 22% 92%", p: "38 55% 55%", pf: "24 30% 7%", a: "30 25% 13%", af: "40 55% 74%" },
  });

  /* ---------- FOOD-TRUCK (10) ---------- */
  def("food-truck", "convoi", "Convoi", {
    brand: ["La ", "Remorque"], tag: "Street craft, carte courte",
    fonts: "shoulders", radius: ".375rem", btn: "square", borderW: 3, tex: "dots",
    nav: "bar", hero: "board", menu: "tickets", foot: "heavy", up: 1, locN: 3, img: 0,
    copy: ["Cuisine de rue, faite dans le camion.", "Carte courte, produits du coin. On bouge chaque jour : commandez, récupérez au guichet."],
    L: { bg: "40 26% 96%", fg: "202 28% 13%", p: "192 62% 27%", pf: "42 40% 97%", a: "192 38% 92%", af: "192 65% 19%" },
    D: { bg: "202 30% 8%", fg: "40 22% 92%", p: "189 55% 47%", pf: "203 40% 8%", a: "192 38% 15%", af: "188 55% 72%" },
  });
  def("food-truck", "routier", "Le Routier", {
    brand: ["Le ", "Routier"], tag: "Relais moderne, portions d'époque",
    fonts: "oswald", radius: ".25rem", btn: "square", borderW: 2, tex: "lines",
    nav: "left", hero: "split", menu: "ledger", foot: "columns", up: 1, locN: 2, img: 1,
    copy: ["La pause qui tient au corps.", "Plats de relais routier revisités depuis un camion : généreux, francs, à prix ouvriers."],
    L: { bg: "210 20% 96%", fg: "215 35% 13%", p: "215 60% 30%", pf: "210 30% 97%", a: "28 80% 89%", af: "25 70% 27%" },
    D: { bg: "215 30% 8%", fg: "210 15% 92%", p: "212 55% 52%", pf: "215 40% 8%", a: "215 30% 15%", af: "210 50% 74%" },
  });
  def("food-truck", "tacoloco", "Taco Loco", {
    brand: ["Taco ", "Loco"], tag: "Street tacos, vraie salsa",
    fonts: "passion", radius: ".75rem", btn: "pill", borderW: 2, tex: "none",
    nav: "center", hero: "collage", menu: "cards", foot: "heavy", up: 1, locN: 3, img: 2, orderBar: 1,
    copy: ["Un camion, mille couleurs.", "Tacos al pastor, salsas maison et maïs grillé. La rue de Mexico, garée près de chez vous."],
    L: { bg: "45 80% 96%", fg: "310 35% 14%", p: "325 75% 45%", pf: "45 90% 96%", a: "170 60% 88%", af: "175 60% 20%" },
    D: { bg: "300 25% 8%", fg: "45 55% 93%", p: "325 80% 60%", pf: "300 25% 8%", a: "170 35% 15%", af: "170 55% 70%" },
  });
  def("food-truck", "seoulstreet", "Seoul Street", {
    brand: ["Seoul ", "Street"], tag: "Corée de rue, feu doux et gochujang",
    fonts: "space", radius: ".5rem", btn: "soft", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "tabs", foot: "center", up: 0, locN: 2, img: 3, darkFirst: 1, orderBar: 1,
    copy: ["Piquant, brillant, addictif.", "Corn dogs, bibimbap et poulet gochujang, préparés minute dans le camion. Précommandez, passez, filez."],
    L: { bg: "0 0% 97%", fg: "345 25% 12%", p: "350 85% 46%", pf: "0 0% 98%", a: "350 60% 93%", af: "350 75% 30%" },
    D: { bg: "345 20% 7%", fg: "0 0% 94%", p: "350 90% 60%", pf: "345 20% 7%", a: "348 40% 15%", af: "350 80% 78%" },
  });
  def("food-truck", "greenwheels", "Green Wheels", {
    brand: ["Green ", "Wheels"], tag: "Camion 100 % végétal",
    fonts: "sora", radius: "1.5rem", btn: "pill", borderW: 1, tex: "none",
    nav: "left", hero: "zen", menu: "zen", foot: "center", up: 0, locN: 2, img: 4,
    copy: ["Végétal, même sur la route.", "Bols, rouleaux et samoussas, tout végétal, tout fait main dans le camion, tout compostable."],
    L: { bg: "95 30% 97%", fg: "160 28% 13%", p: "15 72% 42%", pf: "95 40% 98%", a: "95 40% 90%", af: "120 35% 22%" },
    D: { bg: "160 20% 8%", fg: "95 22% 92%", p: "18 75% 62%", pf: "160 30% 8%", a: "140 22% 14%", af: "110 32% 72%" },
  });
  def("food-truck", "braisenroute", "Braise en Route", {
    brand: ["Braise en ", "Route"], tag: "BBQ fumé, remorque noire",
    fonts: "bebas", radius: ".25rem", btn: "brutal", borderW: 3, tex: "grain",
    nav: "bar", hero: "fullbleed", menu: "tickets", foot: "heavy", up: 1, locN: 3, img: 1, darkFirst: 1,
    copy: ["Fumé douze heures, servi en dix secondes.", "Brisket, pulled pork et ribs, fumés au chêne dans la remorque. Le barbecue qui roule."],
    L: { bg: "30 15% 94%", fg: "15 20% 9%", p: "15 70% 40%", pf: "30 30% 96%", a: "15 45% 90%", af: "15 60% 25%" },
    D: { bg: "15 15% 6%", fg: "30 18% 91%", p: "18 80% 52%", pf: "15 25% 6%", a: "15 35% 13%", af: "20 70% 72%" },
  });
  def("food-truck", "lamarina", "La Marina", {
    brand: ["La ", "Marina"], tag: "La mer au bord du trottoir",
    fonts: "marcellus", radius: ".625rem", btn: "soft", borderW: 2, tex: "lines",
    nav: "center", hero: "editorial", menu: "dotted", foot: "columns", up: 0, locN: 2, img: 5,
    copy: ["Le poisson du jour, au coin de la rue.", "Fish and chips, rouleaux crevette et ceviche du marché, servis depuis notre camion bleu."],
    L: { bg: "195 40% 97%", fg: "210 45% 14%", p: "210 70% 35%", pf: "195 55% 97%", a: "195 55% 90%", af: "205 60% 25%" },
    D: { bg: "210 40% 8%", fg: "195 30% 93%", p: "200 65% 55%", pf: "210 50% 8%", a: "205 35% 15%", af: "195 55% 75%" },
  });
  def("food-truck", "pitstop", "Pit Stop", {
    brand: ["Pit ", "Stop"], tag: "Ravitaillement express",
    fonts: "saira", radius: ".25rem", btn: "square", borderW: 3, tex: "checker",
    nav: "bar", hero: "poster", menu: "bento", foot: "heavy", up: 1, locN: 3, img: 3, orderBar: 1,
    copy: ["ARRÊT AU STAND : 4 MINUTES.", "Commande chronométrée, hot-dogs et smash servis à la volée. Le camion le plus rapide du circuit."],
    L: { bg: "0 0% 97%", fg: "0 0% 8%", p: "0 85% 45%", pf: "0 0% 99%", a: "0 0% 91%", af: "0 0% 20%" },
    D: { bg: "0 0% 7%", fg: "0 0% 95%", p: "0 88% 55%", pf: "0 0% 7%", a: "0 30% 14%", af: "0 70% 78%" },
  });
  def("food-truck", "boheme", "Bohème", {
    brand: ["", "Bohème"], tag: "Le van qui suit le soleil",
    fonts: "cormorant", radius: "1.25rem", btn: "pill", borderW: 1, tex: "dots",
    nav: "minimal", hero: "collage", menu: "zen", foot: "center", up: 0, locN: 2, img: 4,
    copy: ["On cuisine là où c'est joli.", "Assiettes du marché, citronnades maison, nappes à carreaux. Le van s'installe, la table suit."],
    L: { bg: "35 45% 96%", fg: "330 25% 16%", p: "335 55% 44%", pf: "35 60% 97%", a: "265 35% 92%", af: "265 40% 30%" },
    D: { bg: "330 20% 9%", fg: "35 35% 92%", p: "335 60% 65%", pf: "330 30% 9%", a: "265 25% 16%", af: "270 40% 78%" },
  });
  def("food-truck", "nordique", "Nordique", {
    brand: ["", "Nordique"], tag: "Camion scandinave, pain noir",
    fonts: "familjen", radius: ".25rem", btn: "underline", borderW: 1, tex: "none",
    nav: "minimal", hero: "zen", menu: "ledger", foot: "center", up: 0, locN: 1, img: 0,
    copy: ["Smørrebrød et café clair.", "Tartines nordiques, saumon gravlax et légumes pickles, dressés au cordeau dans un camion gris."],
    L: { bg: "210 15% 97%", fg: "215 20% 15%", p: "170 35% 32%", pf: "210 25% 98%", a: "170 25% 92%", af: "170 40% 22%" },
    D: { bg: "215 18% 9%", fg: "210 12% 93%", p: "168 32% 52%", pf: "215 25% 8%", a: "170 20% 15%", af: "165 30% 72%" },
  });

  /* ---------- POULET (10) ---------- */
  def("poulet", "braise", "Braise", {
    brand: ["Master ", "Poulet"], tag: "Rôtisserie urbaine",
    fonts: "barlow", radius: ".5rem", btn: "soft", borderW: 2, tex: "none",
    nav: "left", hero: "poster", menu: "cards", foot: "columns", up: 1, locN: 2, img: 0, orderBar: 1,
    copy: ["Mariné 24 heures. Frit à la commande.", "Panure croustillante, marinades maison, sauces signature. Sur place, à emporter ou livré."],
    L: { bg: "42 45% 97%", fg: "8 22% 11%", p: "355 70% 42%", pf: "42 45% 97%", a: "355 58% 95%", af: "355 72% 28%" },
    D: { bg: "8 16% 7%", fg: "40 30% 93%", p: "355 70% 50%", pf: "42 45% 97%", a: "355 42% 15%", af: "355 80% 78%" },
  });
  def("poulet", "coqdor", "Coq d'Or", {
    brand: ["Le Coq ", "d'Or"], tag: "Rôtisserie de quartier depuis 1962",
    fonts: "playfair", radius: ".375rem", btn: "underline", borderW: 1, tex: "lines",
    nav: "center", hero: "editorial", menu: "dotted", foot: "center", up: 0, locN: 1, img: 2,
    copy: ["Le poulet du dimanche, tous les jours.", "Volailles fermières à la broche, jus de cuisson, pommes rissolées. La rôtisserie d'antan."],
    L: { bg: "42 30% 96%", fg: "150 25% 12%", p: "150 40% 26%", pf: "42 45% 96%", a: "45 65% 88%", af: "40 60% 24%" },
    D: { bg: "150 20% 8%", fg: "42 25% 92%", p: "45 60% 52%", pf: "150 30% 8%", a: "148 22% 14%", af: "45 55% 72%" },
  });
  def("poulet", "krispy", "Krispy Krush", {
    brand: ["Krispy ", "Krush"], tag: "Croustillant niveau maximal",
    fonts: "passion", radius: "1.5rem", btn: "pill", borderW: 2, tex: "dots",
    nav: "center", hero: "collage", menu: "cards", foot: "heavy", up: 1, locN: 3, img: 3, orderBar: 1,
    copy: ["ÇA CROUSTILLE FORT.", "Tenders dorés, wings glacées, buns moelleux. Le poulet frit qui fait du bruit."],
    L: { bg: "48 90% 96%", fg: "25 45% 12%", p: "26 90% 38%", pf: "48 90% 97%", a: "48 95% 86%", af: "35 75% 24%" },
    D: { bg: "25 30% 7%", fg: "48 65% 93%", p: "35 95% 58%", pf: "30 60% 8%", a: "35 45% 14%", af: "45 90% 74%" },
  });
  def("poulet", "seoulfried", "Seoul Fried", {
    brand: ["Seoul ", "Fried"], tag: "K-chicken, double friture",
    fonts: "space", radius: ".5rem", btn: "soft", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "tabs", foot: "center", up: 0, locN: 2, img: 5, darkFirst: 1, orderBar: 1,
    copy: ["Double friture, triple laque.", "Le poulet frit coréen : croûte fine, laque gochujang ou soja-ail, pickles de radis."],
    L: { bg: "0 0% 97%", fg: "260 15% 12%", p: "348 80% 47%", pf: "0 0% 98%", a: "348 55% 94%", af: "348 70% 30%" },
    D: { bg: "260 15% 7%", fg: "0 0% 94%", p: "348 85% 60%", pf: "260 15% 8%", a: "348 40% 15%", af: "348 75% 78%" },
  });
  def("poulet", "fermierchic", "Le Fermier", {
    brand: ["Poulet ", "Fermier"], tag: "Élevé dehors, rôti dedans",
    fonts: "caslon", radius: ".5rem", btn: "soft", borderW: 2, tex: "dots",
    nav: "left", hero: "split", menu: "tickets", foot: "columns", up: 0, locN: 2, img: 4,
    copy: ["Nos poulets ont vu le ciel.", "Volailles Label Rouge élevées en plein air, rôties aux herbes, servies avec leurs légumes."],
    L: { bg: "48 40% 96%", fg: "95 25% 13%", p: "95 40% 30%", pf: "48 55% 96%", a: "48 60% 88%", af: "40 55% 25%" },
    D: { bg: "95 18% 8%", fg: "48 30% 92%", p: "90 35% 50%", pf: "95 28% 8%", a: "92 22% 14%", af: "75 40% 70%" },
  });
  def("poulet", "piriwest", "Piri West", {
    brand: ["Piri ", "West"], tag: "Piri-piri braise et citron",
    fonts: "staat", radius: ".25rem", btn: "square", borderW: 3, tex: "none",
    nav: "bar", hero: "duo", menu: "bento", foot: "heavy", up: 1, locN: 3, img: 1,
    copy: ["LE PIMENT QUI RÉVEILLE.", "Poulet flammé au piri-piri, du doux au très piquant. Choisis ta jauge, assume ta jauge."],
    L: { bg: "45 70% 96%", fg: "0 0% 10%", p: "8 80% 46%", pf: "45 90% 96%", a: "45 90% 86%", af: "25 80% 25%" },
    D: { bg: "0 0% 7%", fg: "45 50% 93%", p: "8 85% 55%", pf: "0 0% 8%", a: "8 45% 14%", af: "12 80% 75%" },
  });
  def("poulet", "bouillon", "Le Bouillon", {
    brand: ["Le ", "Bouillon"], tag: "Poule au pot et volailles rôties",
    fonts: "cormorant", radius: ".375rem", btn: "underline", borderW: 1, tex: "lines",
    nav: "center", hero: "magazine", menu: "ledger", foot: "center", up: 0, locN: 1, img: 2,
    copy: ["La volaille à la façon des bouillons.", "Poule au pot, suprême rôti, frites à la graisse de canard. La grande tradition, prix doux."],
    L: { bg: "40 25% 96%", fg: "355 30% 14%", p: "355 60% 34%", pf: "40 40% 96%", a: "40 45% 90%", af: "355 45% 26%" },
    D: { bg: "355 22% 8%", fg: "40 22% 92%", p: "355 55% 58%", pf: "355 30% 9%", a: "355 30% 15%", af: "0 45% 75%" },
  });
  def("poulet", "wingsclub", "Wings Club", {
    brand: ["Wings ", "Club"], tag: "Le club des ailes, match compris",
    fonts: "saira", radius: ".625rem", btn: "soft", borderW: 2, tex: "none",
    nav: "bar", hero: "board", menu: "tabs", foot: "heavy", up: 1, locN: 3, img: 0, darkFirst: 1, orderBar: 1,
    copy: ["Des wings, un écran, la soirée est faite.", "Douze sauces, trois niveaux de feu, buckets pour la bande. Les soirs de match, ça se réserve."],
    L: { bg: "220 25% 96%", fg: "222 40% 13%", p: "222 65% 35%", pf: "220 40% 97%", a: "38 85% 88%", af: "35 75% 26%" },
    D: { bg: "222 35% 8%", fg: "220 20% 93%", p: "38 90% 55%", pf: "222 45% 8%", a: "222 30% 15%", af: "40 80% 74%" },
  });
  def("poulet", "hotcluck", "Hot Cluck", {
    brand: ["Hot ", "Cluck"], tag: "Nashville hot, version béton",
    fonts: "anton", radius: "0rem", btn: "brutal", borderW: 3, tex: "grain",
    nav: "bar", hero: "poster", menu: "mosaic", foot: "heavy", up: 1, locN: 2, img: 5,
    copy: ["CHAUD. TRÈS CHAUD.", "Poulet Nashville hot, huile pimentée maison, pain de mie beurré. Tu pleures, tu recommandes."],
    L: { bg: "20 30% 95%", fg: "0 0% 8%", p: "14 90% 38%", pf: "20 60% 96%", a: "14 70% 90%", af: "14 75% 26%" },
    D: { bg: "0 0% 6%", fg: "20 25% 92%", p: "14 92% 55%", pf: "0 0% 7%", a: "14 45% 13%", af: "16 85% 74%" },
  });
  def("poulet", "dimanche", "Dimanche", {
    brand: ["Poulet du ", "Dimanche"], tag: "Le repas qui rassemble",
    fonts: "marcellus", radius: "1rem", btn: "pill", borderW: 1, tex: "none",
    nav: "minimal", hero: "zen", menu: "zen", foot: "center", up: 0, locN: 2, img: 4,
    copy: ["Comme chez les grands-parents.", "Poulet rôti, gratin dauphinois, tarte du jour. Le déjeuner du dimanche, disponible toute la semaine."],
    L: { bg: "20 35% 97%", fg: "340 20% 16%", p: "340 45% 45%", pf: "20 50% 98%", a: "150 25% 92%", af: "150 35% 24%" },
    D: { bg: "340 18% 9%", fg: "20 28% 93%", p: "340 50% 62%", pf: "340 30% 9%", a: "150 18% 15%", af: "150 28% 72%" },
  });

  /* ---------- ASIATIQUE (10) ---------- */
  def("asiatique", "izakaya", "Izakaya", {
    brand: ["", "Kōyō"], tag: "Izakaya contemporain",
    fonts: "zenkaku", radius: ".375rem", btn: "square", borderW: 1, tex: "none",
    nav: "minimal", hero: "zen", menu: "zen", foot: "center", up: 0, locN: 2, img: 0,
    copy: ["Le bouillon mijote depuis ce matin.", "Ramen, donburi et petites assiettes, dressés au comptoir. Peu de plats, faits avec soin."],
    L: { bg: "46 25% 97%", fg: "210 14% 11%", p: "168 46% 27%", pf: "46 30% 97%", a: "168 30% 92%", af: "168 52% 19%" },
    D: { bg: "210 20% 7%", fg: "46 18% 92%", p: "166 42% 46%", pf: "210 30% 7%", a: "168 30% 14%", af: "165 45% 70%" },
  });
  def("asiatique", "wokstreet", "Wok Street", {
    brand: ["Wok ", "Street"], tag: "Feu vif, wok qui claque",
    fonts: "bricolage", radius: ".75rem", btn: "soft", borderW: 2, tex: "none",
    nav: "left", hero: "fullbleed", menu: "tabs", foot: "heavy", up: 1, locN: 3, img: 4, darkFirst: 1, orderBar: 1,
    copy: ["Sauté sous tes yeux, servi en boîte.", "Nouilles et riz sautés minute, légumes croquants, flammes hautes. La rue asiatique qui va vite."],
    L: { bg: "0 0% 97%", fg: "20 20% 10%", p: "16 85% 41%", pf: "0 0% 99%", a: "16 60% 93%", af: "16 75% 30%" },
    D: { bg: "20 18% 7%", fg: "0 0% 94%", p: "16 90% 58%", pf: "20 30% 7%", a: "16 45% 14%", af: "18 80% 76%" },
  });
  def("asiatique", "bambou", "Bambou", {
    brand: ["Maison ", "Bambou"], tag: "Vapeur douce, bambou frais",
    fonts: "sora", radius: "1.25rem", btn: "pill", borderW: 1, tex: "none",
    nav: "left", hero: "split", menu: "cards", foot: "columns", up: 0, locN: 2, img: 5,
    copy: ["Tout passe par la vapeur.", "Dim sum faits main, bao moelleux, légumes croquants. La douceur du panier vapeur."],
    L: { bg: "80 25% 97%", fg: "140 30% 12%", p: "140 45% 30%", pf: "80 35% 97%", a: "80 40% 90%", af: "110 40% 22%" },
    D: { bg: "140 22% 8%", fg: "80 20% 92%", p: "135 40% 50%", pf: "140 32% 8%", a: "135 25% 14%", af: "110 35% 72%" },
  });
  def("asiatique", "tokyonight", "Tokyo Night", {
    brand: ["Tokyo ", "Night"], tag: "Ramen bar de minuit",
    fonts: "space", radius: ".375rem", btn: "square", borderW: 1, tex: "none",
    nav: "minimal", hero: "banner", menu: "tabs", foot: "center", up: 0, locN: 2, img: 1, darkFirst: 1, orderBar: 1,
    copy: ["Un bol chaud à minuit passé.", "Comptoir étroit, vapeur épaisse, bouillons profonds. Le ramen-ya des fins de soirée."],
    L: { bg: "220 20% 96%", fg: "230 25% 12%", p: "355 85% 45%", pf: "0 0% 99%", a: "355 55% 94%", af: "355 70% 32%" },
    D: { bg: "232 30% 7%", fg: "220 15% 93%", p: "355 90% 62%", pf: "232 30% 8%", a: "350 40% 15%", af: "355 80% 78%" },
  });
  def("asiatique", "hanoi", "Hanoï", {
    brand: ["Café ", "Hanoï"], tag: "Bols et baguettes d'Indochine",
    fonts: "marcellus", radius: ".625rem", btn: "soft", borderW: 1, tex: "lines",
    nav: "center", hero: "editorial", menu: "dotted", foot: "columns", up: 0, locN: 2, img: 3,
    copy: ["Le phô fume, le café coule.", "Phô parfumé, bánh mì croustillants, café glacé à la vietnamienne. Hanoï, terrasse comprise."],
    L: { bg: "45 35% 96%", fg: "170 30% 13%", p: "170 45% 28%", pf: "45 45% 96%", a: "35 60% 88%", af: "30 60% 26%" },
    D: { bg: "170 25% 8%", fg: "45 28% 92%", p: "168 40% 48%", pf: "170 35% 8%", a: "168 25% 14%", af: "40 50% 72%" },
  });
  def("asiatique", "sichuan", "Sichuan", {
    brand: ["Maison ", "Sichuan"], tag: "Poivre qui engourdit, feu qui réveille",
    fonts: "anton", radius: ".25rem", btn: "brutal", borderW: 3, tex: "none",
    nav: "bar", hero: "poster", menu: "bento", foot: "heavy", up: 1, locN: 1, img: 4,
    copy: ["MÁLÀ : ÇA PIQUE ET ÇA ENGOURDIT.", "Cuisine du Sichuan sans compromis : poivre fleur, huiles rouges, woks brûlants."],
    L: { bg: "0 0% 96%", fg: "0 0% 9%", p: "0 82% 45%", pf: "0 0% 98%", a: "0 55% 92%", af: "0 70% 28%" },
    D: { bg: "0 10% 6%", fg: "0 0% 94%", p: "0 85% 57%", pf: "0 0% 7%", a: "0 45% 14%", af: "0 75% 77%" },
  });
  def("asiatique", "matcha", "Matcha", {
    brand: ["Salon ", "Matcha"], tag: "Salon de thé et petites assiettes",
    fonts: "zenold", radius: ".5rem", btn: "underline", borderW: 1, tex: "none",
    nav: "minimal", hero: "zen", menu: "ledger", foot: "center", up: 0, locN: 1, img: 2,
    copy: ["Le thé d'abord, le reste ensuite.", "Matcha cérémonie, onigiri du jour et desserts wagashi, servis dans le calme."],
    L: { bg: "70 20% 97%", fg: "120 15% 15%", p: "88 30% 34%", pf: "70 30% 98%", a: "88 25% 91%", af: "95 35% 23%" },
    D: { bg: "120 12% 9%", fg: "70 15% 92%", p: "88 28% 52%", pf: "120 20% 9%", a: "90 18% 15%", af: "85 28% 72%" },
  });
  def("asiatique", "dragon", "Dragon", {
    brand: ["Le ", "Dragon"], tag: "Banquet cantonais, laque et or",
    fonts: "playfair", radius: ".375rem", btn: "square", borderW: 1, tex: "none",
    nav: "center", hero: "duo", menu: "mosaic", foot: "heavy", up: 0, locN: 3, img: 5, darkFirst: 1,
    copy: ["Le banquet, tous les soirs.", "Canard laqué, dim sum vapeur et woks de fête. La grande table cantonaise, dressée pour vous."],
    L: { bg: "40 25% 95%", fg: "0 25% 10%", p: "42 70% 40%", pf: "0 25% 8%", a: "42 55% 89%", af: "35 65% 24%" },
    D: { bg: "0 20% 6%", fg: "40 35% 92%", p: "42 80% 55%", pf: "0 30% 7%", a: "40 40% 13%", af: "44 75% 72%" },
  });
  def("asiatique", "banhmi", "Bánh Mì Club", {
    brand: ["Bánh Mì ", "Club"], tag: "Baguette croustillante, cœur vietnamien",
    fonts: "gabaritoLike", radius: "1rem", btn: "pill", borderW: 2, tex: "dots",
    nav: "left", hero: "collage", menu: "cards", foot: "columns", up: 0, locN: 3, img: 3, orderBar: 1,
    copy: ["Le sandwich qui croque à Saïgon.", "Bánh mì généreux, herbes fraîches, pickles maison, sauces qui débordent un peu. Tant mieux."],
    L: { bg: "55 60% 96%", fg: "95 30% 13%", p: "95 55% 32%", pf: "55 70% 97%", a: "18 80% 89%", af: "16 70% 28%" },
    D: { bg: "95 20% 8%", fg: "55 40% 92%", p: "90 50% 48%", pf: "95 30% 8%", a: "18 45% 15%", af: "20 70% 74%" },
  });
  def("asiatique", "omakase", "Omakase", {
    brand: ["", "Omakase"], tag: "On vous laisse choisir pour vous",
    fonts: "mincho", radius: ".125rem", btn: "underline", borderW: 1, tex: "none",
    nav: "center", hero: "magazine", menu: "ledger", foot: "center", up: 0, locN: 1, img: 2, darkFirst: 1,
    copy: ["Faites confiance au comptoir.", "Huit places, un menu unique qui suit la marée et le marché. Le chef décide, vous goûtez."],
    L: { bg: "30 12% 96%", fg: "220 15% 10%", p: "220 15% 14%", pf: "30 20% 97%", a: "30 20% 90%", af: "220 12% 24%" },
    D: { bg: "222 18% 6%", fg: "30 15% 93%", p: "36 45% 62%", pf: "222 25% 7%", a: "220 14% 13%", af: "36 40% 76%" },
  });

  /* gabaritoLike : Gabarito n'était pas dans PAIRINGS, on l'ajoute proprement */
  PAIRINGS.gabaritoLike = { h: "'Gabarito', system-ui, sans-serif", b: "'Onest', system-ui, sans-serif", css: "family=Gabarito:wght@400..900&family=Onest:wght@300..700" };

  const ORDER = ["pizzeria", "fast-food", "food-truck", "poulet", "asiatique"];
  const THEMES = {};
  T.forEach((t) => (THEMES[t.id] = t));

  const api = { PAIRINGS, CATS, THEMES, ORDER, LIST: T, IMG };
  if (typeof window !== "undefined") window.BIDX = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
