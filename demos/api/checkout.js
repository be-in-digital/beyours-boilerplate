/*
 * Crée une session Stripe Checkout EN MODE TEST pour une démo.
 *
 * - La clé secrète vit dans la variable d'env STRIPE_SECRET_KEY (test :
 *   sk_test_…), posée sur Vercel — JAMAIS dans le code ni le dépôt.
 * - Les prix sont recalculés ici (source d'autorité), pas lus depuis le
 *   client : on ne fait confiance qu'aux id d'articles et aux quantités.
 * - Si la clé n'est pas configurée, on renvoie 501 et le front bascule sur
 *   sa simulation locale (la démo reste navigable sans Stripe).
 *
 * Catalogue à garder en phase avec assets/data.js (mêmes id / prix).
 */
const CATALOG = {
  pizzeria: {
    pz1: ["Margherita DOP", 12.5], pz2: ["Diavola", 14], pz3: ["Bufala", 15.5],
    pz4: ["Quattro Formaggi", 15], pz5: ["Tartufo", 18], pz6: ["Ortolana", 14.5],
    pz7: ["Marinara", 10.5], pz8: ["Burrata & jambon", 11],
  },
  "fast-food": {
    ff1: ["Double Smash", 11.9], ff2: ["Classic Cheese", 9.9], ff3: ["Bacon Stack", 13.5],
    ff4: ["Chicken Crisp", 11.5], ff5: ["Veggie Smash", 10.9], ff6: ["Frites maison", 4.5],
    ff7: ["Frites cheddar-bacon", 6.5],
  },
  "food-truck": {
    ft1: ["Le Classique", 9.5], ft2: ["Tacos bœuf braisé", 10], ft3: ["Burrito poulet", 9.5],
    ft4: ["Le Burger du camion", 11], ft5: ["Rouleaux végé", 7.5], ft6: ["Samoussas maison", 6],
    ft7: ["Frites du convoi", 4.5],
  },
  poulet: {
    pl1: ["Bucket 8 pièces", 16.9], pl2: ["Tenders ×5", 8.9], pl3: ["Wings buffalo ×6", 7.5],
    pl4: ["Hot honey wings", 8.5], pl5: ["Poulet entier braisé", 14], pl6: ["Burger Master", 10.9],
    pl7: ["Frites cajun", 4.5],
  },
  asiatique: {
    as1: ["Ramen shōyu", 13.5], as2: ["Ramen tonkotsu", 14.5], as3: ["Ramen végétarien", 12.5],
    as4: ["Donburi saumon", 13], as5: ["Yakisoba", 12], as6: ["Gyoza ×6", 6.5], as7: ["Sushi mix ×12", 14],
  },
};

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try { return JSON.parse(raw || "{}"); } catch (e) { return {}; }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Pas de clé test configurée → le front simulera le paiement.
    res.status(501).json({ error: "STRIPE_SECRET_KEY absente (mode démo sans backend)" });
    return;
  }

  try {
    const { t, items } = await readBody(req);
    const catalog = CATALOG[t];
    if (!catalog || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Panier ou univers invalide" });
      return;
    }

    const line_items = [];
    for (const { id, qty } of items) {
      const entry = catalog[id];
      const q = Math.max(1, Math.min(50, parseInt(qty, 10) || 0));
      if (!entry) continue;
      line_items.push({
        quantity: q,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(entry[1] * 100),
          product_data: { name: entry[0], description: "Démonstration BeYours (paiement de test)" },
        },
      });
    }
    if (line_items.length === 0) {
      res.status(400).json({ error: "Aucun article valide" });
      return;
    }

    const stripe = require("stripe")(key);
    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
    const origin = `${proto}://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      locale: "fr",
      success_url: `${origin}/success.html?t=${encodeURIComponent(t)}`,
      cancel_url: `${origin}/checkout.html?t=${encodeURIComponent(t)}`,
      metadata: { demo: t, source: "beyours-demos" },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("checkout error", err);
    res.status(500).json({ error: "Erreur lors de la création de la session" });
  }
};
