/*
 * Logique partagée des démos BeInDigital.
 * Une seule base pour 5 univers : le thème (couleurs + polices) est posé au
 * runtime depuis window.DEMOS[slug]. Gère 3 pages : store, checkout, success
 * (détectées via <body data-page>). Aucune dépendance, aucun build.
 */
(function () {
  "use strict";

  // ── Icônes (Tabler-like, une famille) ──────────────────────────────────────
  const ICON = {
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    star: '<path d="M12 2l3 6.9 7.5.6-5.7 5 1.7 7.4L12 18l-6.5 3.9 1.7-7.4-5.7-5 7.5-.6z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  };
  const svg = (name, extra) => `<svg viewBox="0 0 24 24"${extra || ""}>${ICON[name]}</svg>`;
  const starSvg = `<svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none">${ICON.star}</svg>`;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const param = (k) => new URLSearchParams(location.search).get(k);
  const eur = (n) => n.toFixed(2).replace(".", ",") + " €";
  const esc = (s) => String(s).replace(/&(?!amp;)/g, "&amp;");

  function getConfig() {
    const slug = param("t");
    const cfg = (window.DEMOS && window.DEMOS[slug]) || window.DEMOS[window.DEMO_ORDER[0]];
    return cfg;
  }

  // ── Thème (couleurs + polices) ───────────────────────────────────────────────
  const MODE_KEY = "bid-demo-mode";
  function currentMode() { return localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light"; }
  function applyTheme(cfg, mode) {
    const root = document.documentElement.style;
    root.setProperty("--radius", cfg.radius);
    root.setProperty("--heading", cfg.fonts.heading);
    root.setProperty("--body", cfg.fonts.body);
    root.setProperty("--track", cfg.fonts.track);
    const colors = mode === "dark" ? cfg.dark : cfg.light;
    for (const k in colors) root.setProperty(k, colors[k]);
  }

  // ── Panier (par univers, en sessionStorage) ──────────────────────────────────
  const cartKey = (slug) => "bid-cart-" + slug;
  function loadCart(slug) {
    try { return JSON.parse(sessionStorage.getItem(cartKey(slug))) || {}; } catch (e) { return {}; }
  }
  function saveCart(slug, items) { sessionStorage.setItem(cartKey(slug), JSON.stringify(items)); }

  const brandHtml = (cfg) =>
    `${esc(cfg.brandPrefix || "")}<span class="flame">${esc(cfg.brandWord)}</span>`;

  // ── Toast ─────────────────────────────────────────────────────────────────────
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  // ── Bandeau + badge DÉMO (sur toutes les pages) ──────────────────────────────
  function injectDemoChrome() {
    const ribbon = document.createElement("div");
    ribbon.className = "demo-ribbon";
    ribbon.innerHTML = '<b>DÉMO INTERACTIVE</b> · aperçu du site, naviguez et testez librement · aucune commande réelle · paiement en mode test';
    document.body.insertBefore(ribbon, document.body.firstChild);
    const badge = document.createElement("div");
    badge.className = "demo-badge"; badge.textContent = "Démo";
    document.body.appendChild(badge);
  }

  // ── Bascule thème (bouton) ───────────────────────────────────────────────────
  function wireThemeToggle(cfg) {
    const btn = document.getElementById("theme-toggle"); if (!btn) return;
    const paint = () => { btn.querySelector("svg").outerHTML = svg(currentMode() === "dark" ? "moon" : "sun"); };
    paint();
    btn.addEventListener("click", () => {
      localStorage.setItem(MODE_KEY, currentMode() === "dark" ? "light" : "dark");
      applyTheme(cfg, currentMode()); paint();
    });
  }

  /* ==========================================================================
   *  PAGE STORE
   * ========================================================================== */
  function renderStore(cfg) {
    document.title = `${(cfg.brandPrefix || "") + cfg.brandWord} · commander en ligne (démo)`;
    let filter = "all";
    const items = loadCart(cfg.slug);

    const app = document.getElementById("app");
    app.innerHTML = `
      <header class="site"><div class="wrap nav">
        <a class="brand" href="index.html">${brandHtml(cfg)}</a>
        <nav class="links">${cfg.nav.map((l) => `<a href="#menu">${esc(l)}</a>`).join("")}</nav>
        <div class="right">
          <button class="icon-btn" id="theme-toggle" title="Clair / sombre" aria-label="Basculer clair/sombre">${svg("sun")}</button>
          <button class="icon-btn cart-btn" id="cart-open" title="Panier" aria-label="Ouvrir le panier">${svg("cart")}<span class="cart-count" id="cart-count">0</span></button>
        </div>
      </div></header>

      <section class="hero"><div class="wrap hero-grid">
        <div>
          <span class="chip"><span class="dot"></span> ${esc(cfg.hero.chip)}</span>
          <h1>${esc(cfg.hero.title)}</h1>
          <p>${esc(cfg.hero.subtitle)}</p>
          <div class="hero-ctas">
            <a class="btn btn-primary" href="#menu">${esc(cfg.hero.cta)} ${svg("arrow")}</a>
            <button class="btn btn-ghost" id="hero-book">Réserver une table</button>
          </div>
        </div>
        <div class="hero-media">
          <div class="photo"><img src="${cfg.hero.image}" alt="${esc(cfg.brandWord)}" onerror="this.style.display='none'"></div>
          <div class="float-badge"><span class="star">${starSvg}</span><div><b>${esc(cfg.hero.rating)}</b><span>${esc(cfg.hero.ratingSub)}</span></div></div>
        </div>
      </div></section>

      <main class="wrap" id="menu">
        <div class="section-head"><h2>La carte</h2><p>Filtrez par famille, ajoutez au panier, testez le paiement.</p></div>
        <div class="filters" id="filters"></div>
        <div class="menu-grid" id="grid"></div>
      </main>

      <footer class="site">
        <div class="wrap foot-grid">
          <div class="col" style="flex:1 1 240px">
            <div class="foot-brand">${brandHtml(cfg)}</div>
            <p style="color:hsl(var(--muted-foreground));max-width:34ch">${esc(cfg.footer.blurb)}</p>
          </div>
          <div class="col"><h4>Horaires</h4>${cfg.footer.hours.map((h) => `<p>${esc(h)}</p>`).join("")}</div>
          <div class="col"><h4>Nous trouver</h4>${cfg.footer.address.map((a) => `<p>${esc(a)}</p>`).join("")}<a href="tel:${cfg.footer.phone.replace(/\s/g, "")}">${esc(cfg.footer.phone)}</a></div>
          <div class="col"><h4>Commander</h4><a href="#menu">Click &amp; collect</a><a href="#menu">Livraison</a><a href="#">Réserver</a></div>
        </div>
        <div class="wrap foot-note">© ${esc(cfg.brandWord)} · Maquette de démonstration pilotée par les tokens du template « ${esc(cfg.label)} » · BeInDigital</div>
      </footer>

      <div class="scrim" id="scrim"></div>
      <aside class="drawer" id="drawer" aria-label="Panier">
        <div class="drawer-head"><h2>Votre panier</h2>
          <button class="icon-btn" id="cart-close" aria-label="Fermer" style="width:38px;height:38px">${svg("close")}</button></div>
        <div class="drawer-items" id="drawer-items"></div>
        <div class="drawer-foot">
          <div class="totrow"><span class="t-label">Total</span><span class="t-val" id="total">0,00 €</span></div>
          <a class="btn btn-primary checkout-btn" id="checkout" href="checkout.html?t=${cfg.slug}">Commander ${svg("arrow")}</a>
        </div>
      </aside>`;

    // Filtres
    const filtersEl = document.getElementById("filters");
    filtersEl.innerHTML = cfg.cats.map((c) => `<button class="pill${c.key === "all" ? " active" : ""}" data-cat="${c.key}">${esc(c.label)}</button>`).join("");
    filtersEl.addEventListener("click", (e) => {
      const b = e.target.closest(".pill"); if (!b) return;
      filter = b.dataset.cat;
      filtersEl.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p === b));
      renderGrid();
    });

    // Grille
    const grid = document.getElementById("grid");
    function renderGrid() {
      const list = cfg.menu.filter((m) => filter === "all" || m.cat === filter);
      grid.innerHTML = list.map((m) => `
        <article class="card">
          <div class="thumb">${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ""}<img src="${m.img}" alt="${esc(m.name)}" loading="lazy" onerror="this.style.display='none'"></div>
          <div class="body"><h3>${esc(m.name)}</h3><p class="desc">${esc(m.desc)}</p>
            <div class="foot"><span class="price">${eur(m.price)}</span>
              <button class="add" data-add="${m.id}">${svg("plus", ' style="width:15px;height:15px"')} Ajouter</button></div>
          </div>
        </article>`).join("");
    }
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]"); if (!b) return;
      items[b.dataset.add] = (items[b.dataset.add] || 0) + 1;
      persist();
      const m = cfg.menu.find((x) => x.id === b.dataset.add);
      toast(`${m.name.replace(/&amp;/g, "&")} ajouté au panier`);
    });

    // Panier
    const countEl = document.getElementById("cart-count");
    const itemsEl = document.getElementById("drawer-items");
    const totalEl = document.getElementById("total");
    function persist() { saveCart(cfg.slug, items); syncCart(); }
    function syncCart() {
      const n = Object.values(items).reduce((a, b) => a + b, 0);
      countEl.textContent = n; countEl.classList.toggle("show", n > 0);
      let total = 0;
      const entries = Object.keys(items).filter((id) => items[id] > 0);
      if (entries.length === 0) {
        itemsEl.innerHTML = `<div class="empty">Votre panier est vide.<br>Ajoutez un plat depuis la carte.</div>`;
      } else {
        itemsEl.innerHTML = entries.map((id) => {
          const m = cfg.menu.find((x) => x.id === id); const q = items[id]; total += m.price * q;
          return `<div class="line">
            <div class="lthumb"><img src="${m.img}" alt="" onerror="this.style.display='none'"></div>
            <div class="lbody"><div class="lname">${esc(m.name)}</div><div class="lprice">${eur(m.price)}</div>
              <div class="qty"><button data-dec="${id}" aria-label="Moins">−</button><span>${q}</span><button data-inc="${id}" aria-label="Plus">+</button></div>
            </div><button class="lremove" data-rm="${id}">Retirer</button></div>`;
        }).join("");
      }
      totalEl.textContent = eur(total);
      document.getElementById("checkout").classList.toggle("btn-ghost", entries.length === 0);
    }
    itemsEl.addEventListener("click", (e) => {
      const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
      if (inc) items[inc.dataset.inc] = (items[inc.dataset.inc] || 0) + 1;
      else if (dec) items[dec.dataset.dec] = Math.max(0, (items[dec.dataset.dec] || 0) - 1);
      else if (rm) delete items[rm.dataset.rm];
      else return;
      persist();
    });

    // Drawer
    const scrim = document.getElementById("scrim"), drawer = document.getElementById("drawer");
    const open = () => { scrim.classList.add("open"); drawer.classList.add("open"); };
    const close = () => { scrim.classList.remove("open"); drawer.classList.remove("open"); };
    document.getElementById("cart-open").addEventListener("click", open);
    document.getElementById("cart-close").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.getElementById("checkout").addEventListener("click", (e) => {
      if (Object.values(items).reduce((a, b) => a + b, 0) === 0) { e.preventDefault(); toast("Ajoutez d'abord un plat"); }
    });
    document.getElementById("hero-book").addEventListener("click", () => toast("Réservation en ligne (démo)"));

    wireThemeToggle(cfg);
    renderGrid(); syncCart();
  }

  /* ==========================================================================
   *  PAGE CHECKOUT
   * ========================================================================== */
  function renderCheckout(cfg) {
    document.title = `Paiement · ${cfg.brandWord} (démo)`;
    const items = loadCart(cfg.slug);
    const entries = Object.keys(items).filter((id) => items[id] > 0);
    const app = document.getElementById("app");

    const header = `
      <header class="site"><div class="wrap nav">
        <a class="brand" href="store.html?t=${cfg.slug}">${brandHtml(cfg)}</a>
        <div class="right"><button class="icon-btn" id="theme-toggle" aria-label="Clair/sombre">${svg("sun")}</button></div>
      </div></header>`;

    if (entries.length === 0) {
      app.innerHTML = header + `<div class="page"><h1>Votre panier est vide</h1>
        <p class="lead">Ajoutez un plat avant de passer au paiement.</p>
        <a class="btn btn-primary" href="store.html?t=${cfg.slug}">${svg("arrow", ' style="transform:rotate(180deg)"')} Retour à la carte</a></div>`;
      wireThemeToggle(cfg); return;
    }

    let total = 0;
    const lines = entries.map((id) => {
      const m = cfg.menu.find((x) => x.id === id); const q = items[id]; total += m.price * q;
      return `<div class="co-line"><div class="cthumb"><img src="${m.img}" alt="" onerror="this.style.display='none'"></div>
        <div class="cbody"><div class="cname">${esc(m.name)}</div><div class="cqty">Quantité : ${q}</div></div>
        <div class="cprice">${eur(m.price * q)}</div></div>`;
    }).join("");

    app.innerHTML = header + `
      <div class="page">
        <h1>Paiement</h1>
        <p class="lead">Récapitulatif de votre commande chez ${esc(cfg.brandWord)}. Réglez avec la carte de test ci-dessous, aucun débit réel.</p>

        <div class="testcard">
          <h4>${svg("lock", ' style="width:15px;height:15px;display:inline;vertical-align:-2px"')} Carte de test Stripe (mode démo)</h4>
          <div class="num" id="cardnum">4242 4242 4242 4242 <button class="copy" id="copycard">copier</button></div>
          <div class="row"><span><b>Date</b> n'importe quelle date future (ex. 12/34)</span><span><b>CVC</b> 3 chiffres</span><span><b>Code postal</b> 75000</span></div>
        </div>

        <div class="co-card">
          ${lines}
          <div class="co-total"><span class="t-label">Total à payer</span><span class="amt">${eur(total)}</span></div>
        </div>

        <button class="btn btn-primary checkout-btn" id="pay" style="margin-bottom:14px">${svg("lock")} Payer ${eur(total)} en test</button>
        <a class="btn btn-ghost checkout-btn" href="store.html?t=${cfg.slug}">Continuer mes achats</a>
        <p class="lead" style="margin-top:20px;font-size:13px">Paiement sécurisé par Stripe en mode test. En production, ce bouton débite réellement la carte du client via le compte Stripe du restaurant.</p>
      </div>`;

    document.getElementById("copycard").addEventListener("click", () => {
      navigator.clipboard && navigator.clipboard.writeText("4242424242424242");
      toast("Numéro de carte copié");
    });

    document.getElementById("pay").addEventListener("click", async function () {
      const btn = this; btn.disabled = true; btn.style.opacity = ".6";
      btn.innerHTML = "Redirection vers Stripe…";
      try {
        const res = await fetch("api/checkout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t: cfg.slug, items: entries.map((id) => ({ id, qty: items[id] })) }),
        });
        if (!res.ok) throw new Error("no-backend");
        const data = await res.json();
        if (data && data.url) { location.href = data.url; return; }
        throw new Error("no-url");
      } catch (e) {
        // Pas de backend (aperçu local / static) → simulation du paiement test
        location.href = `success.html?t=${cfg.slug}&sim=1`;
      }
    });

    wireThemeToggle(cfg);
  }

  /* ==========================================================================
   *  PAGE SUCCESS
   * ========================================================================== */
  function renderSuccess(cfg) {
    document.title = `Commande confirmée · ${cfg.brandWord} (démo)`;
    saveCart(cfg.slug, {}); // vide le panier après « paiement »
    const sim = param("sim") === "1";
    const app = document.getElementById("app");
    app.innerHTML = `
      <header class="site"><div class="wrap nav"><a class="brand" href="store.html?t=${cfg.slug}">${brandHtml(cfg)}</a>
        <div class="right"><button class="icon-btn" id="theme-toggle" aria-label="Clair/sombre">${svg("sun")}</button></div></div></header>
      <div class="page">
        <div class="success-mark">${svg("check")}</div>
        <h1>Commande confirmée</h1>
        <p class="lead">Merci ! Votre paiement de test a été accepté${sim ? " (simulation locale)" : " par Stripe"}. En production, le restaurant reçoit la commande dans son tableau de bord et le client un e-mail de confirmation.</p>
        <div class="testcard" style="margin-top:8px"><h4>Rappel démonstration</h4>Ceci était un aperçu interactif. Aucune commande réelle n'a été passée, aucun montant réel débité.</div>
        <a class="btn btn-primary" href="store.html?t=${cfg.slug}">Revenir à la carte</a>
      </div>`;
    wireThemeToggle(cfg);
  }

  /* ── Init ──────────────────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    if (!window.DEMOS) return;
    const cfg = getConfig();
    applyTheme(cfg, currentMode());
    injectDemoChrome();
    const page = document.body.getAttribute("data-page");
    if (page === "store") renderStore(cfg);
    else if (page === "checkout") renderCheckout(cfg);
    else if (page === "success") renderSuccess(cfg);
  });
})();
