/*
 * Socle partagé des démos BeInDigital.
 *
 * Expose window.BID (helpers réutilisés par les stores bespoke : thème, panier,
 * toast, bandeau démo, icônes, format prix) et rend les pages partagées
 * checkout + success (les stores, eux, ont chacun leur design propre).
 */
(function () {
  "use strict";

  const ICON = {
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    star: '<path d="M12 2l3 6.9 7.5.6-5.7 5 1.7 7.4L12 18l-6.5 3.9 1.7-7.4-5.7-5 7.5-.6z"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  };
  const svg = (name, extra) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"${extra || ""}>${ICON[name]}</svg>`;

  const param = (k) => new URLSearchParams(location.search).get(k);
  const eur = (n) => n.toFixed(2).replace(".", ",") + " €";
  const esc = (s) => String(s).replace(/&(?!amp;)/g, "&amp;");

  // ── Thème ────────────────────────────────────────────────────────────────────
  const MODE_KEY = "bid-demo-mode";
  const currentMode = () => (localStorage.getItem(MODE_KEY) === "dark" ? "dark" : "light");
  const setMode = (m) => localStorage.setItem(MODE_KEY, m === "dark" ? "dark" : "light");
  function applyTheme(cfg, mode) {
    const root = document.documentElement.style;
    root.setProperty("--radius", cfg.radius);
    root.setProperty("--heading", cfg.fonts.heading);
    root.setProperty("--body", cfg.fonts.body);
    root.setProperty("--track", cfg.fonts.track);
    const colors = (mode || currentMode()) === "dark" ? cfg.dark : cfg.light;
    for (const k in colors) root.setProperty(k, colors[k]);
  }

  // ── Panier (par univers, en sessionStorage) ──────────────────────────────────
  const cartKey = (slug) => "bid-cart-" + slug;
  const loadCart = (slug) => { try { return JSON.parse(sessionStorage.getItem(cartKey(slug))) || {}; } catch (e) { return {}; } };
  const saveCart = (slug, items) => sessionStorage.setItem(cartKey(slug), JSON.stringify(items));
  const cartCount = (items) => Object.values(items).reduce((a, b) => a + b, 0);
  function cartTotal(cfg, items) {
    return Object.keys(items).reduce((t, id) => {
      const m = cfg.menu.find((x) => x.id === id); return t + (m ? m.price * items[id] : 0);
    }, 0);
  }

  // ── Toast ─────────────────────────────────────────────────────────────────────
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.style.cssText = "position:fixed;bottom:26px;left:50%;transform:translate(-50%,20px);background:hsl(var(--foreground));color:hsl(var(--background));padding:12px 20px;border-radius:999px;font-size:14px;font-weight:600;z-index:80;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;box-shadow:0 12px 30px -8px hsl(var(--foreground)/.4);font-family:var(--body,system-ui)";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = "1"; toastEl.style.transform = "translate(-50%,0)";
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.opacity = "0"; toastEl.style.transform = "translate(-50%,20px)"; }, 1900);
  }

  // ── Bandeau + badge DÉMO ──────────────────────────────────────────────────────
  function injectDemoChrome() {
    const ribbon = document.createElement("div");
    ribbon.style.cssText = "background:hsl(var(--foreground));color:hsl(var(--background));font-family:var(--body,system-ui);font-size:12.5px;font-weight:650;text-align:center;padding:7px 16px;position:relative;z-index:70";
    ribbon.innerHTML = '<b style="font-weight:800">DÉMO INTERACTIVE</b> · aperçu du site, naviguez et testez librement · aucune commande réelle · paiement en mode test';
    document.body.insertBefore(ribbon, document.body.firstChild);
    const badge = document.createElement("div");
    badge.textContent = "Démo";
    badge.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:75;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-family:var(--body,system-ui);font-size:11px;font-weight:800;letter-spacing:.08em;padding:7px 13px;border-radius:999px;text-transform:uppercase;box-shadow:0 10px 25px -8px hsl(var(--foreground)/.4);pointer-events:none";
    document.body.appendChild(badge);
  }

  const brandHtml = (cfg) => `${esc(cfg.brandPrefix || "")}<span class="flame">${esc(cfg.brandWord)}</span>`;

  // Expose helpers pour les stores bespoke
  window.BID = { ICON, svg, eur, esc, param, applyTheme, currentMode, setMode, loadCart, saveCart, cartCount, cartTotal, toast, injectDemoChrome, brandHtml, getConfig };

  function getConfig() {
    const slug = param("t");
    return (window.DEMOS && window.DEMOS[slug]) || (window.DEMOS && window.DEMOS[window.DEMO_ORDER[0]]);
  }

  /* ==========================================================================
   *  PAGES PARTAGÉES : CHECKOUT + SUCCESS (chargent demo.css)
   * ========================================================================== */
  function wireThemeToggle(cfg) {
    const btn = document.getElementById("theme-toggle"); if (!btn) return;
    const paint = () => { btn.querySelector("svg").outerHTML = svg(currentMode() === "dark" ? "moon" : "sun"); };
    paint();
    btn.addEventListener("click", () => { setMode(currentMode() === "dark" ? "light" : "dark"); applyTheme(cfg, currentMode()); paint(); });
  }

  function renderCheckout(cfg) {
    document.title = `Paiement · ${cfg.brandWord} (démo)`;
    const items = loadCart(cfg.slug);
    const entries = Object.keys(items).filter((id) => items[id] > 0);
    const app = document.getElementById("app");
    const storeHref = `${cfg.slug}.html`;
    const header = `<header class="site"><div class="wrap nav">
      <a class="brand" href="${storeHref}">${brandHtml(cfg)}</a>
      <div class="right"><button class="icon-btn" id="theme-toggle" aria-label="Clair/sombre">${svg("sun")}</button></div></div></header>`;

    if (entries.length === 0) {
      app.innerHTML = header + `<div class="page"><h1>Votre panier est vide</h1>
        <p class="lead">Ajoutez un plat avant de passer au paiement.</p>
        <a class="btn btn-primary" href="${storeHref}">Retour à la carte</a></div>`;
      wireThemeToggle(cfg); return;
    }
    let total = 0;
    const lines = entries.map((id) => {
      const m = cfg.menu.find((x) => x.id === id); const q = items[id]; total += m.price * q;
      return `<div class="co-line"><div class="cthumb"><img src="${m.img}" alt="" onerror="this.style.display='none'"></div>
        <div class="cbody"><div class="cname">${esc(m.name)}</div><div class="cqty">Quantité : ${q}</div></div>
        <div class="cprice">${eur(m.price * q)}</div></div>`;
    }).join("");

    app.innerHTML = header + `<div class="page">
      <h1>Paiement</h1>
      <p class="lead">Récapitulatif de votre commande chez ${esc(cfg.brandWord)}. Réglez avec la carte de test ci-dessous, aucun débit réel.</p>
      <div class="testcard">
        <h4>${svg("lock", ' style="width:15px;height:15px;display:inline;vertical-align:-2px"')} Carte de test Stripe (mode démo)</h4>
        <div class="num" id="cardnum">4242 4242 4242 4242 <button class="copy" id="copycard">copier</button></div>
        <div class="row"><span><b>Date</b> future quelconque (ex. 12/34)</span><span><b>CVC</b> 3 chiffres</span><span><b>Code postal</b> 75000</span></div>
      </div>
      <div class="co-card">${lines}<div class="co-total"><span class="t-label">Total à payer</span><span class="amt">${eur(total)}</span></div></div>
      <button class="btn btn-primary checkout-btn" id="pay" style="margin-bottom:14px">${svg("lock")} Payer ${eur(total)} en test</button>
      <a class="btn btn-ghost checkout-btn" href="${storeHref}">Continuer mes achats</a>
      <p class="lead" style="margin-top:20px;font-size:13px">Paiement sécurisé par Stripe en mode test. En production, ce bouton débite réellement la carte du client via le compte Stripe du restaurant.</p></div>`;

    document.getElementById("copycard").addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText("4242424242424242"); toast("Numéro de carte copié"); });
    document.getElementById("pay").addEventListener("click", async function () {
      this.disabled = true; this.style.opacity = ".6"; this.innerHTML = "Redirection vers Stripe…";
      try {
        const res = await fetch("api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: cfg.slug, items: entries.map((id) => ({ id, qty: items[id] })) }) });
        if (!res.ok) throw new Error("no-backend");
        const data = await res.json();
        if (data && data.url) { location.href = data.url; return; }
        throw new Error("no-url");
      } catch (e) { location.href = `success.html?t=${cfg.slug}&sim=1`; }
    });
    wireThemeToggle(cfg);
  }

  function renderSuccess(cfg) {
    document.title = `Commande confirmée · ${cfg.brandWord} (démo)`;
    saveCart(cfg.slug, {});
    const sim = param("sim") === "1";
    const app = document.getElementById("app");
    app.innerHTML = `<header class="site"><div class="wrap nav"><a class="brand" href="${cfg.slug}.html">${brandHtml(cfg)}</a>
        <div class="right"><button class="icon-btn" id="theme-toggle" aria-label="Clair/sombre">${svg("sun")}</button></div></div></header>
      <div class="page">
        <div class="success-mark">${svg("check")}</div>
        <h1>Commande confirmée</h1>
        <p class="lead">Merci ! Votre paiement de test a été accepté${sim ? " (simulation locale)" : " par Stripe"}. En production, le restaurant reçoit la commande dans son tableau de bord et le client un e-mail de confirmation.</p>
        <div class="testcard" style="margin-top:8px"><h4>Rappel démonstration</h4>Ceci était un aperçu interactif. Aucune commande réelle n'a été passée, aucun montant réel débité.</div>
        <a class="btn btn-primary" href="${cfg.slug}.html">Revenir à la carte</a>
      </div>`;
    wireThemeToggle(cfg);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.DEMOS) return;
    const page = document.body.getAttribute("data-page");
    if (page !== "checkout" && page !== "success") return; // les stores gèrent eux-mêmes
    const cfg = getConfig();
    applyTheme(cfg, currentMode());
    injectDemoChrome();
    if (page === "checkout") renderCheckout(cfg);
    else renderSuccess(cfg);
  });
})();
