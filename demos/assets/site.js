/*
 * Moteur multipage des démos BeYours.
 *
 * Chaque page est une coquille <body data-page="…"> ; ce moteur lit le thème
 * (?t=<themeId>), pose les tokens + polices + data-attributes de familles de
 * layout, puis rend la page : home, menu, about, contact, locations, reserve,
 * checkout, success. Panier par catégorie, lieu actif par thème, réservation
 * créable ET annulable. Tous les liens mènent quelque part.
 */
(function () {
  "use strict";
  const X = window.BIDX;
  if (!X) return;

  /* ── Icônes ── */
  const IC = {
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    star: '<path d="M12 2l3 6.9 7.5.6-5.7 5 1.7 7.4L12 18l-6.5 3.9 1.7-7.4-5.7-5 7.5-.6z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  };
  const svg = (n, cls) => `<svg class="i${cls ? " " + cls : ""}" viewBox="0 0 24 24">${IC[n]}</svg>`;

  /* ── Utilitaires ── */
  const qs = (k) => new URLSearchParams(location.search).get(k);
  const eur = (n) => n.toFixed(2).replace(".", ",") + " €";
  const esc = (s) => String(s).replace(/&(?!amp;)/g, "&amp;").replace(/</g, "&lt;");
  const hsl = (s) => `hsl(${s})`;
  const P = (s) => { const m = s.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/); return { h: +m[1], s: +m[2], l: +m[3] }; };
  const F = (c) => `${c.h} ${c.s}% ${c.l}%`;
  const mix = (a, b, t) => ({ h: a.h + (b.h - a.h) * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t });

  /* ── Résolution du thème (compat anciens slugs de catégorie) ── */
  const LEGACY = { pizzeria: "pizzeria-trattoria", "fast-food": "fast-food-smash", "food-truck": "food-truck-convoi", poulet: "poulet-braise", asiatique: "asiatique-izakaya" };
  const tid = (() => {
    const raw = qs("t") || "pizzeria-trattoria";
    if (X.THEMES[raw]) return raw;
    if (LEGACY[raw]) return LEGACY[raw];
    return "pizzeria-trattoria";
  })();
  const T = X.THEMES[tid];
  const PACK = X.CATS[T.cat];
  const PAIR = X.PAIRINGS[T.fonts];
  const LOCS = PACK.locations.slice(0, T.locN);

  /* ── Override « aux couleurs du prospect » (?brand / ?primary / ?accent) ──
     Permet de rebadger n'importe quel thème en direct pendant un rendez-vous.
     Couleurs acceptées : hex (#e63946 ou e63946) ou HSL "h s% l%". */
  const OV = { brand: qs("brand"), primary: qs("primary"), accent: qs("accent") };
  const KEEP = ["brand", "primary", "accent"].filter((k) => OV[k]);
  function hexToHsl(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  function toHsl(v) { if (!v) return null; const m = v.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/); if (m) return { h: +m[1], s: +m[2], l: +m[3] }; return hexToHsl(v); }
  const OV_P = toHsl(OV.primary), OV_A = toHsl(OV.accent);

  const brandParts = (() => {
    if (!OV.brand) return T.brand;
    const w = OV.brand.trim().split(/\s+/);
    return w.length > 1 ? [w.slice(0, -1).join(" ") + " ", w[w.length - 1]] : ["", OV.brand.trim()];
  })();
  const href = (page) => { const p = new URLSearchParams({ t: tid }); KEEP.forEach((k) => p.set(k, OV[k])); return `${page}.html?${p.toString()}`; };
  const brandHtml = () => `${esc(brandParts[0])}<span class="fl">${esc(brandParts[1])}</span>`;
  const brandTxt = () => brandParts[0] + brandParts[1];

  /* ── Mode clair/sombre ── */
  const MODE_KEY = "bidx-mode";
  const mode = () => localStorage.getItem(MODE_KEY) || (T.darkFirst ? "dark" : "light");
  const setMode = (m) => localStorage.setItem(MODE_KEY, m);

  /* ── Application du thème (tokens dérivés + polices + familles) ── */
  function applyTheme() {
    const st = document.documentElement.style;
    const C = mode() === "dark" ? T.D : T.L;
    const bg = P(C.bg), fg = P(C.fg);
    const dark = bg.l < 50;
    st.setProperty("--background", C.bg);
    st.setProperty("--foreground", C.fg);
    st.setProperty("--primary", C.p);
    st.setProperty("--primary-foreground", C.pf);
    st.setProperty("--accent", C.a);
    st.setProperty("--accent-foreground", C.af);
    st.setProperty("--card", F(mix(bg, { h: bg.h, s: bg.s, l: dark ? bg.l + 3.5 : Math.min(100, bg.l + 2) }, 1)));
    st.setProperty("--secondary", F(mix(bg, fg, dark ? 0.09 : 0.06)));
    st.setProperty("--muted", F(mix(bg, fg, dark ? 0.09 : 0.06)));
    st.setProperty("--muted-foreground", F(mix(fg, bg, dark ? 0.3 : 0.34)));
    st.setProperty("--border", F(mix(bg, fg, dark ? 0.13 : 0.12)));
    st.setProperty("--ring", C.p);
    // Override couleurs prospect : la primaire/l'accent passent à sa charte,
    // le texte des boutons est recalculé pour rester lisible (AA).
    if (OV_P) {
      const pf = OV_P.l > 62 ? "0 0% 10%" : "0 0% 100%";
      st.setProperty("--primary", F(OV_P)); st.setProperty("--ring", F(OV_P)); st.setProperty("--primary-foreground", pf);
      if (!OV_A) { st.setProperty("--accent", F({ h: OV_P.h, s: Math.min(OV_P.s, dark ? 40 : 55), l: dark ? 15 : 92 }));
        st.setProperty("--accent-foreground", F({ h: OV_P.h, s: OV_P.s, l: dark ? 74 : 28 })); }
    }
    if (OV_A) { st.setProperty("--accent", F({ h: OV_A.h, s: OV_A.s, l: dark ? 15 : 92 }));
      st.setProperty("--accent-foreground", F({ h: OV_A.h, s: OV_A.s, l: dark ? 74 : 28 })); }
    st.setProperty("--radius", T.radius);
    st.setProperty("--bw", (T.borderW || 1) + "px");
    st.setProperty("--heading", PAIR.h);
    st.setProperty("--body", PAIR.b);
    st.setProperty("--track", T.up ? ".01em" : "-0.01em");
    const de = document.documentElement;
    de.dataset.nav = T.nav; de.dataset.hero = T.hero; de.dataset.menu = T.menu;
    de.dataset.btn = T.btn; de.dataset.tex = T.tex; de.dataset.foot = T.foot;
    de.dataset.up = T.up ? "1" : "0";
  }
  function injectFonts() {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = `https://fonts.googleapis.com/css2?${PAIR.css}&display=swap`;
    document.head.appendChild(l);
  }

  /* ── Panier (par catégorie) ── */
  const CART_KEY = "bidx-cart-" + T.cat;
  const cart = (() => { try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || {}; } catch (e) { return {}; } })();
  const cartSave = () => sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  const cartN = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.keys(cart).reduce((t, id) => { const d = PACK.dishes.find((x) => x.id === id); return t + (d ? d.price * cart[id] : 0); }, 0);

  /* ── Lieu actif ── */
  const LOC_KEY = "bidx-loc-" + tid;
  function activeLoc() {
    const id = sessionStorage.getItem(LOC_KEY);
    return LOCS.find((l) => l.id === id) || LOCS[0];
  }
  function setLoc(id) { sessionStorage.setItem(LOC_KEY, id); }
  const mapsUrl = (l) => "https://maps.google.com/?q=" + encodeURIComponent(brandTxt() + " " + l.addr);

  /* ── Réservations (annulables) ── */
  const RESA_KEY = "bidx-resa-" + tid;
  const getResa = () => { try { return JSON.parse(localStorage.getItem(RESA_KEY)); } catch (e) { return null; } };
  const setResa = (r) => localStorage.setItem(RESA_KEY, JSON.stringify(r));
  const delResa = () => localStorage.removeItem(RESA_KEY);

  /* ── Toast ── */
  let toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  /* ── Analytics (opt-in, off par défaut, aucune clé commitée) ──
     Pour activer : définir window.POSTHOG_KEY (clé publique phc_… PostHog)
     avant site.js, ou l'injecter via Vercel. Sans clé : aucun réseau. */
  function track(ev, props) { try { if (window.posthog) window.posthog.capture(ev, Object.assign({ theme: tid, categorie: T.cat }, props)); } catch (e) {} }
  function initAnalytics() {
    const key = window.POSTHOG_KEY; if (!key || window.__phInit) return; window.__phInit = 1;
    const host = window.POSTHOG_HOST || "https://us.i.posthog.com";
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split("."); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; } (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) { var e = "posthog"; return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e; }, u.people.toString = function () { return u.toString(1) + ".people (stub)"; }, o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep".split(" "), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]); }, e.__SV = 1); }(document, window.posthog || []);
    window.posthog.init(key, { api_host: host, capture_pageview: true, autocapture: false });
    track("demo_theme_viewed", { theme_name: T.name, brand: brandTxt() });
  }

  /* ══════════ Chrome commun ══════════ */
  const NAVL = [
    ["home", "Accueil"], ["menu", "La carte"], ["about", "À propos"],
    ["locations", LOCS.length > 1 ? "Nos adresses" : "Nous trouver"], ["reserve", "Réserver"], ["contact", "Contact"],
  ];
  function chrome(page, inner) {
    const mk = (arr) => arr.map(([p, l]) => `<a href="${href(p)}"${p === page ? ' class="on"' : ""}>${l}</a>`).join("");
    const center = T.nav === "center";
    const links = center ? mk(NAVL.slice(0, 3)) : mk(NAVL);
    const linksB = center ? `<nav class="nl nl-b">${mk(NAVL.slice(3))}</nav>` : "";
    const locChip = LOCS.length > 1 ? `<a class="locchip" href="${href("locations")}" title="Changer de lieu">${svg("pin")} ${esc(activeLoc().name)}</a>` : "";
    document.getElementById("app").innerHTML = `
      <div class="demo-ribbon"><b>DÉMO INTERACTIVE</b> · aucune commande réelle · paiement en mode test · <a href="admin.html?t=${tid}" style="text-decoration:underline">voir le tableau de bord restaurateur →</a></div>
      <header class="nav"><div class="wrap nav-in">
        <a class="brand" href="${href("home")}">${brandHtml()}</a>
        <nav class="nl">${links}</nav>
        <div class="nav-r">
          ${linksB}
          ${locChip}
          <button class="ib" id="mode-t" aria-label="Basculer clair/sombre">${svg(mode() === "dark" ? "moon" : "sun")}</button>
          <button class="ib" id="cart-o" aria-label="Ouvrir le panier">${svg("cart")}<span class="cartn" id="cartn">0</span></button>
          <button class="ib burger" id="burger" aria-label="Menu">${svg("menu")}</button>
        </div>
      </div>
      <nav class="mnav" id="mnav" aria-label="Menu mobile">
        ${NAVL.map(([p, l]) => `<a href="${href(p)}"${p === page ? ' class="on"' : ""}>${l}</a>`).join("")}
        <div class="mnav-cta"><a class="btn btn-p" href="${href("menu")}">Commander</a><a class="btn btn-g" href="${href("reserve")}">Réserver</a></div>
      </nav></header>
      ${inner}
      <footer class="site"><div class="wrap">
        <div class="ft-in">
          <div class="ft-col" style="flex:1 1 230px"><div class="ft-brand">${brandHtml()}</div>
            <p class="muted" style="max-width:32ch;margin-top:8px">${esc(T.tag)}.</p></div>
          <div class="ft-col"><h4>Pages</h4>${NAVL.slice(1).map(([p, l]) => `<a href="${href(p)}">${l}</a>`).join("")}</div>
          <div class="ft-col"><h4>${LOCS.length > 1 ? "Adresses" : "Adresse"}</h4>${LOCS.map((l) => `<p>${esc(l.addr)}</p>`).join("")}</div>
          <div class="ft-col"><h4>Contact</h4><a href="tel:${LOCS[0].phone.replace(/\s/g, "")}">${esc(LOCS[0].phone)}</a><a href="mailto:${PACK.email}">${PACK.email}</a></div>
        </div>
        <div class="ft-note">© ${esc(brandTxt())} · <a href="${href("legal")}" style="text-decoration:underline">Mentions légales</a> · démonstration BeYours · thème « ${esc(T.name)} », catégorie ${esc(PACK.label)}</div>
      </div></footer>

      ${T.orderBar ? `<div class="orderbar" id="orderbar"><div class="in" id="orderbar-in"><span class="cnt" id="ob-n">0</span><span class="lbl">Voir ma commande</span><span class="tot" id="ob-t">0,00 €</span>${svg("arrow")}</div></div>` : ""}
      <div class="scrim" id="scrim"></div>
      <aside class="drawer" id="drawer" aria-label="Panier">
        <div class="dw-h"><h2>Votre panier</h2><button class="ib" id="cart-c" style="width:37px;height:37px" aria-label="Fermer">${svg("close")}</button></div>
        ${LOCS.length > 1 ? `<div class="dw-loc">${svg("pin")} <span>Commande : <b id="dw-locname"></b></span><a href="${href("locations")}">changer</a></div>` : ""}
        <div class="dw-items" id="dw-items"></div>
        <div class="dw-f"><div class="dw-tot"><span class="muted" style="font-size:14px">Total</span><span class="tv" id="dw-tot">0,00 €</span></div>
          <a class="btn btn-p" id="go-checkout" href="${href("checkout")}">Commander ${svg("arrow")}</a></div>
      </aside>
      <div class="demo-badge">Démo</div>`;
    wireChrome();
  }

  function wireChrome() {
    const mt = document.getElementById("mode-t");
    mt.addEventListener("click", () => { setMode(mode() === "dark" ? "light" : "dark"); applyTheme(); mt.innerHTML = svg(mode() === "dark" ? "moon" : "sun"); });
    const scrim = document.getElementById("scrim"), drawer = document.getElementById("drawer");
    const open = () => { scrim.classList.add("open"); drawer.classList.add("open"); };
    const close = () => { scrim.classList.remove("open"); drawer.classList.remove("open"); };
    document.getElementById("cart-o").addEventListener("click", open);
    document.getElementById("cart-c").addEventListener("click", close);
    scrim.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    const ob = document.getElementById("orderbar-in");
    if (ob) ob.addEventListener("click", open);
    const burger = document.getElementById("burger"), mnav = document.getElementById("mnav");
    if (burger) burger.addEventListener("click", () => {
      const on = mnav.classList.toggle("open");
      burger.innerHTML = svg(on ? "close" : "menu");
    });
    document.getElementById("go-checkout").addEventListener("click", (e) => { if (cartN() === 0) { e.preventDefault(); toast("Votre panier est vide"); } });
    document.getElementById("app").addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]"), inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
      if (add) { cart[add.dataset.add] = (cart[add.dataset.add] || 0) + 1; cartSave(); syncCart(); const d = PACK.dishes.find((x) => x.id === add.dataset.add); toast(`${d.name.replace(/&amp;/g, "&")} ajouté au panier`); track("add_to_cart", { item: d.name, price: d.price }); }
      else if (inc) { cart[inc.dataset.inc]++; cartSave(); syncCart(); }
      else if (dec) { cart[dec.dataset.dec] = Math.max(0, cart[dec.dataset.dec] - 1); if (!cart[dec.dataset.dec]) delete cart[dec.dataset.dec]; cartSave(); syncCart(); }
      else if (rm) { delete cart[rm.dataset.rm]; cartSave(); syncCart(); }
    });
    syncCart();
  }

  function syncCart() {
    const n = cartN(), total = cartTotal();
    const cn = document.getElementById("cartn");
    if (cn) { cn.textContent = n; cn.classList.toggle("show", n > 0); }
    const obn = document.getElementById("ob-n"), obt = document.getElementById("ob-t"), obar = document.getElementById("orderbar");
    if (obar) { obn.textContent = n; obt.textContent = eur(total); obar.classList.toggle("show", n > 0); }
    const items = document.getElementById("dw-items"), tot = document.getElementById("dw-tot");
    const locName = document.getElementById("dw-locname");
    if (locName) locName.textContent = activeLoc().name;
    if (!items) return;
    const ids = Object.keys(cart).filter((id) => cart[id] > 0);
    if (!ids.length) items.innerHTML = `<div class="dw-empty">Votre panier est vide.<br>Ajoutez un plat depuis la carte.</div>`;
    else items.innerHTML = ids.map((id) => {
      const d = PACK.dishes.find((x) => x.id === id);
      return `<div class="dw-li"><div class="lt"><img src="${d.img}" alt="" onerror="this.style.display='none'"></div>
        <div class="lb"><div class="ln">${esc(d.name)}</div><div class="lp">${eur(d.price)}</div>
          <div class="qty"><button data-dec="${id}" aria-label="Moins">−</button><span>${cart[id]}</span><button data-inc="${id}" aria-label="Plus">+</button></div></div>
        <button class="dw-rm" data-rm="${id}">retirer</button></div>`;
    }).join("");
    tot.textContent = eur(total);
  }

  /* ══════════ Rendus de menu (8 familles) ══════════ */
  const dishesByCat = () => PACK.cats.map((c) => ({ c, list: PACK.dishes.filter((d) => d.cat === c.key) })).filter((g) => g.list.length);
  const addBtn = (d) => `<button class="add" data-add="${d.id}">${svg("plus")} Ajouter</button>`;
  const tag = (d) => (d.tag ? `<span class="tagchip">${esc(d.tag)}</span>` : "");

  function renderMenu(dishes, style, full) {
    const groups = full ? dishesByCat() : [{ c: null, list: dishes }];
    if (style === "dotted") return `<div class="menu-dotted">${groups.map((g) => `<div class="mcat">${g.c ? `<h3>${esc(g.c.label)}</h3><div class="rule"></div>` : ""}${g.list.map((d) => `
      <div class="dish"><span class="n">${esc(d.name)}${tag(d)}</span><span class="price">${eur(d.price)}</span>
      <button class="addbtn" data-add="${d.id}" aria-label="Ajouter ${esc(d.name)}">${svg("plus")}</button>
      <span class="d">${esc(d.desc)}</span></div>`).join("")}</div>`).join("")}</div>`;
    if (style === "tickets") return `<div class="menu-tickets">${groups.map((g) => `${g.c ? `<h3 class="mcat-h" style="font-family:var(--heading);text-transform:uppercase;font-size:17px;color:hsl(var(--primary));margin:22px 0 10px">${esc(g.c.label)}</h3>` : ""}${g.list.map((d) => `
      <div class="dish"><div class="th"><img src="${d.img}" alt="${esc(d.name)}" loading="lazy" onerror="this.style.display='none'"></div>
      <div><div class="n">${esc(d.name)}${tag(d)}</div><div class="d">${esc(d.desc)}</div></div>
      <span class="price">${eur(d.price)}</span>${addBtn(d)}</div>`).join("")}`).join("")}</div>`;
    if (style === "zen") return `<div class="menu-zen">${groups.map((g) => `${g.c ? `<h3>${esc(g.c.label)}</h3>` : ""}${g.list.map((d) => `
      <div class="dish"><div class="th"><img src="${d.img}" alt="" loading="lazy" onerror="this.style.display='none'"></div>
      <div><div class="n">${esc(d.name)}${tag(d)}</div><div class="d">${esc(d.desc)}</div></div>
      <div class="right"><span class="price">${eur(d.price)}</span>${addBtn(d)}</div></div>`).join("")}`).join("")}</div>`;
    if (style === "mosaic") return `<div class="menu-mosaic"><div class="mgrid">${groups.flatMap((g) => g.list).map((d) => `
      <div class="dish"><img src="${d.img}" alt="${esc(d.name)}" loading="lazy" onerror="this.style.display='none'">
      <div class="ov"><div class="n">${esc(d.name)}</div><div class="d">${esc(d.desc)}</div>
      <div class="row"><span class="price">${eur(d.price)}</span>${addBtn(d)}</div></div></div>`).join("")}</div></div>`;
    if (style === "ledger") { let i = 0; return `<div class="menu-ledger">${groups.map((g) => `${g.c ? `<h3>${esc(g.c.label)}</h3>` : ""}${g.list.map((d) => { i++; return `
      <div class="dish"><span class="num">${String(i).padStart(2, "0")}</span>
      <span class="n">${esc(d.name)}${tag(d)}</span><span class="price">${eur(d.price)}</span>${addBtn(d)}
      <span class="d">${esc(d.desc)}</span></div>`; }).join("")}`).join("")}</div>`; }
    if (style === "bento") return `<div class="menu-bento"><div class="mgrid">${groups.flatMap((g) => g.list).map((d) => `
      <div class="dish"><img src="${d.img}" alt="${esc(d.name)}" loading="lazy" onerror="this.style.display='none'">
      <div class="ov"><div><div class="n">${esc(d.name)}</div><div class="d">${esc(d.desc)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="price">${eur(d.price)}</span>${addBtn(d)}</div></div></div>`).join("")}</div></div>`;
    if (style === "tabs" && full) return `<div class="menu-tabs"><div class="tabbar"><div class="wrap tabs-in" id="tabbar">
      <button class="tab on" data-cat="all">Tout</button>${PACK.cats.map((c) => `<button class="tab" data-cat="${c.key}">${esc(c.label)}</button>`).join("")}</div></div>
      <div class="wrap" id="tabzone">${renderTabRows(PACK.dishes)}</div></div>`;
    if (style === "tabs") return `<div class="menu-tabs">${renderTabRows(dishes)}</div>`;
    /* cards par défaut */
    return `<div class="menu-cards">${groups.map((g) => `${g.c ? `<h3>${esc(g.c.label)}</h3>` : ""}<div class="mgrid">${g.list.map((d) => `
      <article class="dish"><div class="th"><img src="${d.img}" alt="${esc(d.name)}" loading="lazy" onerror="this.style.display='none'"></div>
      <div class="b"><div class="n">${esc(d.name)}${tag(d)}</div><p class="d">${esc(d.desc)}</p>
      <div class="row"><span class="price">${eur(d.price)}</span>${addBtn(d)}</div></div></article>`).join("")}</div>`).join("")}</div>`;
  }
  const renderTabRows = (list) => list.map((d) => `
    <div class="dish"><div class="th"><img src="${d.img}" alt="" loading="lazy" onerror="this.style.display='none'"></div>
    <div><div class="n">${esc(d.name)}${tag(d)}</div><div class="d">${esc(d.desc)}</div></div>
    <div class="right"><span class="price">${eur(d.price)}</span>${addBtn(d)}</div></div>`).join("");

  /* ══════════ Heros (10 familles) ══════════ */
  function renderHero() {
    const img = X.IMG(PACK.heroImgs[T.img % PACK.heroImgs.length]);
    const ctas = `<div class="hero-actions"><a class="btn btn-p" href="${href("menu")}">Commander ${svg("arrow")}</a><a class="btn btn-g" href="${href("reserve")}">Réserver une table</a></div>`;
    const eyebrow = `<div class="eyebrow">${esc(T.tag)}</div>`;
    const H = esc(T.copy[0]), S = esc(T.copy[1]);
    switch (T.hero) {
      case "editorial": return `<section class="hero-editorial"><div class="wrap g"><div>${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div>
        <div class="ph"><div class="round"><img src="${img}" alt="${esc(brandTxt())}"></div><div class="stamp"><div><b>4,8</b><span>sur 5</span></div></div></div></div></section>`;
      case "fullbleed": return `<section class="hero-fullbleed"><div class="bg"><img src="${img}" alt=""></div>
        <div class="wrap in">${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div></section>`;
      case "poster": return `<section class="hero-poster"><div class="wrap">${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div>
        <div class="marq"><div class="tk">${Array(3).fill(`${esc(T.tag)} <span>●</span> ${esc(PACK.label)} <span>●</span> Commande en ligne <span>●</span>`).join(" ")}</div></div></section>`;
      case "split": return `<section class="hero-split"><div class="wrap g"><div>${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div>
        <div class="frm"><img src="${img}" alt="${esc(brandTxt())}"></div></div></section>`;
      case "board": {
        const days = LOCS.map((l, i) => `<div class="board-day"><div class="dn">${esc(l.name)}</div><div class="sp">${esc(l.addr.split(",")[0])}</div><div class="hr">${esc(l.hours)}</div></div>`).join("");
        return `<section class="hero-board"><div class="wrap">${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}
        <div class="board"><div class="board-top">${svg("pin")} Où nous trouver <span class="live"><span class="dot"></span> ${LOCS.length > 1 ? LOCS.length + " lieux" : "En service"}</span></div>
        <div class="board-days">${days}</div></div></div></section>`;
      }
      case "magazine": return `<section class="hero-magazine"><div class="wrap"><div class="rule"></div>
        <div class="meta"><span>${esc(PACK.label)}</span><span>${esc(T.tag)}</span><span>Paris</span></div>
        <h1>${H}</h1><div class="g"><div class="col"><p class="hsub">${S}</p>${ctas}</div>
        <div class="ph"><img src="${img}" alt="${esc(brandTxt())}"></div></div></div></section>`;
      case "zen": return `<section class="hero-zen"><div class="wrap g"><div>${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div>
        <div class="ph"><img src="${img}" alt="${esc(brandTxt())}"></div></div></section>`;
      case "banner": return `<section class="hero-banner"><div class="wrap in"><div><h1>${H}</h1><p class="hsub">${S}</p>
        <a class="btn btn-p" href="${href("menu")}">Commander ${svg("arrow")}</a></div>
        <div class="ph"><img src="${img}" alt="${esc(brandTxt())}"></div></div></section>`;
      case "collage": {
        const img2 = X.IMG(PACK.heroImgs[(T.img + 2) % PACK.heroImgs.length]);
        return `<section class="hero-collage"><div class="wrap g"><div>${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>${ctas}</div>
        <div class="ph"><div class="p1"><img src="${img}" alt=""></div><div class="p2"><img src="${img2}" alt=""></div>
        <span class="stick">${esc(PACK.label)}</span></div></div></section>`;
      }
      case "duo": return `<section class="hero-duo"><div class="wrap in"><div class="txt">${eyebrow}<h1>${H}</h1><p class="hsub">${S}</p>
        <div class="hero-actions"><a class="btn btn-p" href="${href("menu")}">Commander ${svg("arrow")}</a><a class="btn btn-g" style="border-color:hsl(var(--background)/.4);color:hsl(var(--background))" href="${href("reserve")}">Réserver</a></div></div>
        <div class="ph"><img src="${img}" alt="${esc(brandTxt())}"></div></div></section>`;
    }
    return "";
  }

  /* ══════════ Pages ══════════ */
  function pageHome() {
    document.title = `${brandTxt()} · ${T.tag} (démo)`;
    const featured = PACK.dishes.slice(0, 3);
    const locsTeaser = T.hero === "board" ? "" : `
      <section class="sec"><div class="wrap"><div class="sec-h"><h2>${LOCS.length > 1 ? "Nos adresses" : "Où nous trouver"}</h2>
      <p>${LOCS.length > 1 ? "Commandez ou réservez dans le lieu qui vous arrange." : "Commande en ligne, réservation et retrait sur place."}</p></div>
      <div class="locgrid">${LOCS.map((l) => locCard(l, false)).join("")}</div>
      ${LOCS.length > 1 ? `<div class="sec-more"><a class="btn btn-g" href="${href("locations")}">Toutes les adresses ${svg("arrow")}</a></div>` : ""}</div></section>`;
    chrome("home", `
      ${renderHero()}
      <section class="sec"><div class="wrap"><div class="sec-h"><h2>Les incontournables</h2><p>Un aperçu de la carte, à commander en deux gestes.</p></div>
        ${renderMenu(featured, T.menu === "tabs" ? "cards" : T.menu, false)}
        <div class="sec-more"><a class="btn btn-p" href="${href("menu")}">Voir toute la carte ${svg("arrow")}</a></div></div></section>
      <section class="storyband"><div class="wrap in"><div><blockquote>« ${esc(PACK.story.quote)} »</blockquote><div class="sig">${esc(PACK.story.sig)} · <a href="${href("about")}" style="text-decoration:underline">notre histoire</a></div></div>
        <div class="ph"><img src="${X.IMG(PACK.galleryImgs[0])}" alt="" loading="lazy"></div></div></section>
      ${locsTeaser}`);
  }

  function locCard(l, withChoose) {
    const active = activeLoc().id === l.id && LOCS.length > 1;
    return `<div class="loccard${active ? " on" : ""}">${active ? '<span class="onlab">Lieu sélectionné</span>' : ""}
      <h3>${esc(l.name)}</h3><span class="adr">${esc(l.addr)}</span>
      <span class="hrs">${esc(l.hours)}</span><span class="tel"><a href="tel:${l.phone.replace(/\s/g, "")}">${esc(l.phone)}</a></span>
      <a class="map" href="${mapsUrl(l)}" target="_blank" rel="noopener">Itinéraire (Google Maps)</a>
      <div class="acts">
        ${withChoose && LOCS.length > 1 ? `<button class="btn btn-p" data-choose="${l.id}">Commander ici</button>` : `<a class="btn btn-p" href="${href("menu")}">Commander</a>`}
        <a class="btn btn-g" href="${href("reserve")}&loc=${l.id}">Réserver</a>
      </div></div>`;
  }

  function pageMenu() {
    document.title = `La carte · ${brandTxt()} (démo)`;
    chrome("menu", `
      <div class="wrap page-head"><h1>La carte</h1><p>${esc(T.tag)}. Ajoutez au panier puis passez commande, le paiement de démonstration est en mode test.</p></div>
      <section class="sec" style="padding-top:22px"><div class="${T.menu === "tabs" ? "" : "wrap"}">${renderMenu(PACK.dishes, T.menu, true)}</div></section>`);
    if (T.menu === "tabs") {
      const bar = document.getElementById("tabbar"), zone = document.getElementById("tabzone");
      bar.addEventListener("click", (e) => {
        const b = e.target.closest(".tab"); if (!b) return;
        bar.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === b));
        const k = b.dataset.cat;
        zone.innerHTML = renderTabRows(k === "all" ? PACK.dishes : PACK.dishes.filter((d) => d.cat === k));
      });
    }
  }

  function pageAbout() {
    document.title = `À propos · ${brandTxt()} (démo)`;
    chrome("about", `
      <div class="wrap page-head"><h1>${esc(PACK.story.title)}</h1><p>${esc(T.tag)}.</p></div>
      <div class="wrap about-g">
        <div class="prose">${PACK.story.text.map((p) => `<p>${esc(p)}</p>`).join("")}
          <div class="quotebig">« ${esc(PACK.story.quote)} »<div class="muted" style="font-size:14px;margin-top:8px;font-family:var(--body)">${esc(PACK.story.sig)}</div></div>
          <div class="hero-actions" style="margin-top:26px"><a class="btn btn-p" href="${href("menu")}">Voir la carte ${svg("arrow")}</a><a class="btn btn-g" href="${href("reserve")}">Réserver une table</a></div></div>
        <div class="gal"><div class="g1"><img src="${X.IMG(PACK.galleryImgs[0])}" alt="" loading="lazy"></div>
          <div class="row"><div class="g2"><img src="${X.IMG(PACK.galleryImgs[1])}" alt="" loading="lazy"></div>
          <div class="g2"><img src="${X.IMG(PACK.galleryImgs[2])}" alt="" loading="lazy"></div></div></div>
      </div>`);
  }

  function pageLocations() {
    document.title = `${LOCS.length > 1 ? "Nos adresses" : "Nous trouver"} · ${brandTxt()} (démo)`;
    chrome("locations", `
      <div class="wrap page-head"><h1>${LOCS.length > 1 ? "Nos adresses" : "Nous trouver"}</h1>
      <p>${LOCS.length > 1 ? "Choisissez votre lieu : la commande et la réservation s'y rattachent." : "Une seule adresse, tout le reste en ligne."}</p></div>
      <section class="sec" style="padding-top:24px"><div class="wrap"><div class="locgrid" id="locgrid">${LOCS.map((l) => locCard(l, true)).join("")}</div></div></section>`);
    document.getElementById("locgrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-choose]"); if (!b) return;
      setLoc(b.dataset.choose);
      const l = LOCS.find((x) => x.id === b.dataset.choose);
      toast(`Lieu sélectionné : ${l.name}`);
      document.getElementById("locgrid").innerHTML = LOCS.map((x) => locCard(x, true)).join("");
      syncCart();
      const chip = document.querySelector(".locchip");
      if (chip) chip.innerHTML = `${svg("pin")} ${esc(l.name)}`;
    });
  }

  const SLOTS = ["12:00", "12:30", "13:00", "13:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"];
  function pageReserve() {
    document.title = `Réserver · ${brandTxt()} (démo)`;
    const locParam = qs("loc");
    if (locParam && LOCS.some((l) => l.id === locParam)) setLoc(locParam);
    const existing = getResa();
    chrome("reserve", `
      <div class="wrap page-head"><h1>Réserver une table</h1><p>Réservation de démonstration : elle est confirmée immédiatement et reste annulable ici même. Aucune vraie table n'est bloquée.</p></div>
      <section class="sec" style="padding-top:24px"><div class="wrap" id="resa-zone"></div></section>`);
    const zone = document.getElementById("resa-zone");
    if (existing && existing.status === "confirmed") renderResaCard(zone, existing);
    else renderResaForm(zone);
  }

  function renderResaForm(zone) {
    const today = new Date(); today.setDate(today.getDate() + 1);
    const minDate = today.toISOString().slice(0, 10);
    zone.innerHTML = `
      <form class="form" id="resa-form" novalidate>
        ${LOCS.length > 1 ? `<div class="f-row"><label for="r-loc">Lieu</label><select class="inp" id="r-loc">${LOCS.map((l) => `<option value="${l.id}"${activeLoc().id === l.id ? " selected" : ""}>${esc(l.name)} · ${esc(l.addr.split(",")[0])}</option>`).join("")}</select></div>` : ""}
        <div class="f-2">
          <div class="f-row"><label for="r-date">Date</label><input class="inp" type="date" id="r-date" min="${minDate}" value="${minDate}"><span class="f-err" id="e-date">Choisissez une date à venir.</span></div>
          <div class="f-row"><label for="r-time">Heure</label><select class="inp" id="r-time">${SLOTS.map((s) => `<option${s === "20:00" ? " selected" : ""}>${s}</option>`).join("")}</select></div>
        </div>
        <div class="f-2">
          <div class="f-row"><label for="r-guests">Couverts</label><select class="inp" id="r-guests">${[1,2,3,4,5,6,7,8].map((n) => `<option${n === 2 ? " selected" : ""}>${n}</option>`).join("")}</select></div>
          <div class="f-row"><label for="r-phone">Téléphone</label><input class="inp" type="tel" id="r-phone" placeholder="06 12 34 56 78" autocomplete="tel"><span class="f-err" id="e-phone">Un numéro pour confirmer, au moins 10 chiffres.</span></div>
        </div>
        <div class="f-row"><label for="r-name">Nom de la réservation</label><input class="inp" type="text" id="r-name" placeholder="Nom et prénom" autocomplete="name"><span class="f-err" id="e-name">Indiquez un nom.</span></div>
        <button class="btn btn-p" type="submit">Confirmer la réservation ${svg("check")}</button>
        <p class="helper">Démo : la confirmation est instantanée et locale à ce navigateur.</p>
      </form>`;
    document.getElementById("resa-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("r-name").value.trim();
      const phone = document.getElementById("r-phone").value.replace(/\D/g, "");
      const date = document.getElementById("r-date").value;
      let ok = true;
      const err = (id, bad) => { document.getElementById(id).classList.toggle("show", bad); if (bad) ok = false; };
      err("e-name", name.length < 2);
      err("e-phone", phone.length < 10);
      err("e-date", !date || date < new Date().toISOString().slice(0, 10));
      if (!ok) return;
      const locSel = document.getElementById("r-loc");
      const locId = locSel ? locSel.value : LOCS[0].id;
      setLoc(locId);
      const resa = {
        ref: "R-" + Date.now().toString(36).toUpperCase().slice(-6),
        name, phone: document.getElementById("r-phone").value.trim(), date,
        time: document.getElementById("r-time").value,
        guests: document.getElementById("r-guests").value,
        locId, status: "confirmed",
      };
      setResa(resa);
      track("reservation_made", { couverts: resa.guests, lieu: (LOCS.find((l) => l.id === locId) || LOCS[0]).name });
      toast("Réservation confirmée");
      renderResaCard(document.getElementById("resa-zone"), resa);
      window.scrollTo({ top: 0 });
    });
  }

  function renderResaCard(zone, r) {
    const loc = LOCS.find((l) => l.id === r.locId) || LOCS[0];
    const dateFr = new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    zone.innerHTML = `
      <div class="resa-card">
        <div class="okmark">${svg("check")}</div>
        <h2>Réservation confirmée</h2>
        <p class="muted" style="font-size:14px;margin-bottom:10px">Au nom de <b>${esc(r.name)}</b></p>
        <span class="resa-ref">Réf. ${r.ref}</span>
        <div class="resa-line"><span>Lieu</span><b>${esc(loc.name)} · ${esc(loc.addr.split(",")[0])}</b></div>
        <div class="resa-line"><span>Date</span><b>${esc(dateFr)}</b></div>
        <div class="resa-line"><span>Heure</span><b>${r.time}</b></div>
        <div class="resa-line"><span>Couverts</span><b>${r.guests}</b></div>
        <div class="resa-line"><span>Téléphone</span><b>${esc(r.phone)}</b></div>
        <div class="resa-acts">
          <button class="btn btn-danger" id="resa-cancel">Annuler la réservation</button>
          <a class="btn btn-g" href="${href("menu")}">Voir la carte</a>
        </div>
      </div>`;
    document.getElementById("resa-cancel").addEventListener("click", () => {
      delResa();
      toast("Réservation annulée");
      zone.innerHTML = `
        <div class="cancelled"><b>Réservation ${r.ref} annulée.</b><br>La table est libérée (démo). Vous pouvez en refaire une autre tout de suite.</div>
        <div style="margin-top:18px"><button class="btn btn-p" id="resa-again">Nouvelle réservation</button></div>`;
      document.getElementById("resa-again").addEventListener("click", () => renderResaForm(zone));
    });
  }

  function pageContact() {
    document.title = `Contact · ${brandTxt()} (démo)`;
    chrome("contact", `
      <div class="wrap page-head"><h1>Contact</h1><p>Une question, un événement, une remarque : écrivez-nous ou appelez le lieu le plus proche.</p></div>
      <div class="wrap about-g" style="padding-top:26px">
        <div>
          <form class="form" id="c-form" novalidate>
            <div class="f-2">
              <div class="f-row"><label for="c-name">Nom</label><input class="inp" id="c-name" autocomplete="name"><span class="f-err" id="ce-name">Indiquez un nom.</span></div>
              <div class="f-row"><label for="c-mail">E-mail</label><input class="inp" type="email" id="c-mail" autocomplete="email"><span class="f-err" id="ce-mail">E-mail invalide.</span></div>
            </div>
            <div class="f-row"><label for="c-msg">Message</label><textarea class="inp" id="c-msg" rows="5"></textarea><span class="f-err" id="ce-msg">Dites-nous en un peu plus.</span></div>
            <button class="btn btn-p" type="submit">Envoyer le message</button>
            <p class="helper">Démo : le message n'est pas réellement envoyé. En production il part vers l'e-mail du restaurant.</p>
          </form>
          <div id="c-ok" style="display:none" class="resa-card"><div class="okmark">${svg("check")}</div><h2>Message envoyé</h2><p class="muted">Merci ! En production, l'équipe vous répond par e-mail sous 24 h. (Démo : rien n'a été transmis.)</p></div>
        </div>
        <div>
          <div class="locgrid" style="grid-template-columns:1fr">${LOCS.map((l) => `
            <div class="loccard"><h3>${esc(l.name)}</h3><span class="adr">${esc(l.addr)}</span>
            <span class="hrs">${esc(l.hours)}</span>
            <span class="tel"><a href="tel:${l.phone.replace(/\s/g, "")}">${esc(l.phone)}</a></span>
            <a class="map" href="${mapsUrl(l)}" target="_blank" rel="noopener">Itinéraire (Google Maps)</a></div>`).join("")}
          <div class="loccard"><h3>Par e-mail</h3><a class="map" href="mailto:${PACK.email}">${PACK.email}</a></div></div>
        </div>
      </div>`);
    document.getElementById("c-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("c-name").value.trim();
      const mail = document.getElementById("c-mail").value.trim();
      const msg = document.getElementById("c-msg").value.trim();
      let ok = true;
      const err = (id, bad) => { document.getElementById(id).classList.toggle("show", bad); if (bad) ok = false; };
      err("ce-name", name.length < 2);
      err("ce-mail", !/^\S+@\S+\.\S+$/.test(mail));
      err("ce-msg", msg.length < 10);
      if (!ok) return;
      document.getElementById("c-form").style.display = "none";
      document.getElementById("c-ok").style.display = "block";
      toast("Message envoyé (démo)");
    });
  }

  function pageCheckout() {
    document.title = `Paiement · ${brandTxt()} (démo)`;
    const ids = Object.keys(cart).filter((id) => cart[id] > 0);
    let inner;
    if (!ids.length) {
      inner = `<div class="wrap page-head"><h1>Votre panier est vide</h1><p>Ajoutez un plat depuis la carte avant de passer au paiement.</p>
        <div class="hero-actions" style="margin-top:20px"><a class="btn btn-p" href="${href("menu")}">Voir la carte ${svg("arrow")}</a></div></div><div style="height:90px"></div>`;
    } else {
      let total = 0;
      const lines = ids.map((id) => {
        const d = PACK.dishes.find((x) => x.id === id); const q = cart[id]; total += d.price * q;
        return `<div class="co-line"><div class="cth"><img src="${d.img}" alt="" onerror="this.style.display='none'"></div>
          <div><div class="cn">${esc(d.name)}</div><div class="cq">Quantité : ${q}</div></div><span class="cp">${eur(d.price * q)}</span></div>`;
      }).join("");
      const loc = activeLoc();
      inner = `
      <div class="wrap page-head"><h1>Paiement</h1><p>Récapitulatif de votre commande. Réglez avec la carte de test : aucun débit réel.</p></div>
      <section class="sec" style="padding-top:20px"><div class="wrap">
        <div class="testcard"><h4>${svg("lock")} Carte de test Stripe (mode démo)</h4>
          <div class="num">4242 4242 4242 4242 <button class="copy" id="copycard">copier</button></div>
          <div class="row"><span><b>Date</b> future quelconque (ex. 12/34)</span><span><b>CVC</b> 3 chiffres</span><span><b>Code postal</b> 75000</span></div></div>
        <div class="co-card">
          <div class="co-line" style="padding-top:2px"><div>${svg("pin")}</div><div><div class="cn">${LOCS.length > 1 ? "Retrait : " + esc(loc.name) : esc(loc.name)}</div><div class="cq">${esc(loc.addr)}</div></div>
            ${LOCS.length > 1 ? `<a href="${href("locations")}" style="margin-left:auto;text-decoration:underline;font-size:13px">changer</a>` : ""}</div>
          ${lines}
        </div>
        <div class="co-tot"><span class="muted">Total à payer</span><span class="amt">${eur(total)}</span></div>
        <div style="max-width:720px;display:grid;gap:12px;margin-top:18px">
          <button class="btn btn-p" id="pay">${svg("lock")} Payer ${eur(total)} en test</button>
          <a class="btn btn-g" href="${href("menu")}">Continuer mes achats</a>
          <p class="helper">Paiement sécurisé par Stripe en mode test. En production, ce bouton débite réellement la carte du client via le compte Stripe du restaurant.</p>
        </div></div></section>`;
    }
    chrome("checkout", inner);
    const copy = document.getElementById("copycard");
    if (copy) copy.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText("4242424242424242"); toast("Numéro copié"); });
    const pay = document.getElementById("pay");
    if (pay) pay.addEventListener("click", async function () {
      track("begin_checkout", { total: cartTotal(), articles: cartN(), lieu: activeLoc().name });
      this.disabled = true; this.style.opacity = ".6"; this.textContent = "Redirection vers Stripe…";
      try {
        const res = await fetch("api/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ t: T.cat, items: Object.keys(cart).filter((id) => cart[id] > 0).map((id) => ({ id, qty: cart[id] })), theme: tid }) });
        if (!res.ok) throw new Error("no-backend");
        const data = await res.json();
        if (data && data.url) { location.href = data.url; return; }
        throw new Error("no-url");
      } catch (e) { location.href = `success.html?t=${tid}&sim=1`; }
    });
  }

  const ORDER_KEY = "bidx-order-" + tid;
  function pageSuccess() {
    document.title = `Commande confirmée · ${brandTxt()} (démo)`;
    const loc = activeLoc();
    // Enregistre la commande (pour le suivi) avant de vider le panier
    const items = Object.keys(cart).filter((id) => cart[id] > 0).map((id) => { const d = PACK.dishes.find((x) => x.id === id); return { name: d.name, qty: cart[id] }; });
    const order = { ref: "C-" + Date.now().toString(36).toUpperCase().slice(-6), ts: Date.now(), locId: loc.id, items, total: cartTotal() };
    if (items.length) localStorage.setItem(ORDER_KEY, JSON.stringify(order));
    track("order_paid", { total: order.total, ref: order.ref, lieu: loc.name });
    Object.keys(cart).forEach((k) => delete cart[k]); cartSave();
    const sim = qs("sim") === "1";
    chrome("success", `
      <div class="wrap page-head" style="padding-bottom:40px">
        <div class="resa-card" style="margin-top:10px">
          <div class="okmark">${svg("check")}</div>
          <h2>Commande confirmée</h2>
          <p class="muted" style="margin:6px 0 12px">Votre paiement de test a été accepté${sim ? " (simulation locale)" : " par Stripe"}. En production, le restaurant reçoit la commande en cuisine et le client un e-mail de confirmation.</p>
          <span class="resa-ref">Commande ${order.ref}</span>
          <div class="resa-line"><span>Retrait</span><b>${esc(loc.name)}</b></div>
          <div class="resa-line"><span>Adresse</span><b>${esc(loc.addr)}</b></div>
          <div class="resa-acts"><a class="btn btn-p" href="${href("track")}">Suivre ma commande</a><a class="btn btn-g" href="${href("menu")}">Recommander</a></div>
        </div>
        <p class="helper" style="margin-top:16px">Rappel : ceci est une démonstration BeYours. Aucune commande réelle, aucun débit réel.</p>
      </div>`);
  }

  function pageTrack() {
    document.title = `Suivi de commande · ${brandTxt()} (démo)`;
    const order = (() => { try { return JSON.parse(localStorage.getItem(ORDER_KEY)); } catch (e) { return null; } })();
    if (!order) {
      chrome("track", `<div class="wrap page-head"><h1>Suivi de commande</h1><p>Aucune commande en cours dans cette démo. Passez commande pour voir le suivi en direct.</p>
        <div class="hero-actions" style="margin-top:18px"><a class="btn btn-p" href="${href("menu")}">Voir la carte ${svg("arrow")}</a></div></div><div style="height:60px"></div>`);
      return;
    }
    const loc = LOCS.find((l) => l.id === order.locId) || LOCS[0];
    const STEPS = [["Commande reçue", 0], ["En préparation", 40], ["Bientôt prête", 90], ["Prête à retirer", 150]];
    chrome("track", `
      <div class="wrap page-head"><h1>Suivi de commande</h1><p>Commande <b>${order.ref}</b> · retrait chez ${esc(loc.name)}. Le statut avance en direct (démo accélérée).</p></div>
      <section class="sec" style="padding-top:22px"><div class="wrap" style="max-width:640px">
        <div class="track-head"><div><div class="muted" style="font-size:13px">Temps estimé</div><div class="track-eta" id="track-eta">—</div></div>
          <div class="track-badge" id="track-badge">…</div></div>
        <div class="track-steps" id="track-steps"></div>
        <div class="co-card" style="margin-top:20px">${order.items.map((it) => `<div class="co-line"><div class="cn">${esc(it.name)}</div><div class="cq">× ${it.qty}</div><div class="cp">&nbsp;</div></div>`).join("")}
          <div class="co-tot" style="margin-top:12px"><span class="muted">Total payé</span><span class="amt">${eur(order.total)}</span></div></div>
        <div class="hero-actions" style="margin-top:20px"><a class="btn btn-g" href="${href("home")}">Accueil</a></div>
      </div></section>`);
    const stepsEl = document.getElementById("track-steps"), etaEl = document.getElementById("track-eta"), badgeEl = document.getElementById("track-badge");
    function tick() {
      const el = Math.floor((Date.now() - order.ts) / 1000);
      let idx = 0; STEPS.forEach((s, i) => { if (el >= s[1]) idx = i; });
      const ready = idx >= STEPS.length - 1;
      stepsEl.innerHTML = STEPS.map((s, i) => `<div class="track-step ${i < idx ? "done" : i === idx ? "cur" : ""}">
        <span class="tk-dot">${i <= idx ? svg("check") : ""}</span><span class="tk-lbl">${s[0]}</span></div>`).join("");
      badgeEl.textContent = ready ? "Prête" : STEPS[idx][0];
      badgeEl.classList.toggle("ready", ready);
      etaEl.textContent = ready ? "À retirer maintenant" : `~ ${Math.max(1, Math.ceil((STEPS[STEPS.length - 1][1] - el) / 60))} min`;
      etaEl.innerHTML = ready ? `${svg("bell")} À retirer maintenant` : etaEl.textContent;
    }
    tick(); const iv = setInterval(tick, 1500);
    window.addEventListener("beforeunload", () => clearInterval(iv));
  }

  function pageLegal() {
    document.title = `Mentions légales · ${brandTxt()} (démo)`;
    const loc = LOCS[0];
    chrome("legal", `
      <div class="wrap page-head"><h1>Mentions légales</h1><p>Page de démonstration : contenu d'exemple, à remplacer par les informations réelles du restaurant.</p></div>
      <div class="wrap prose" style="padding:20px 0 40px">
        <h3 style="margin:18px 0 8px">Éditeur</h3>
        <p>${esc(brandTxt())} (nom commercial de démonstration), ${esc(loc.addr)}. Téléphone : ${esc(loc.phone)}. E-mail : ${PACK.email}.</p>
        <h3 style="margin:18px 0 8px">Hébergement</h3>
        <p>Site hébergé par Vercel Inc. Les paiements sont traités par Stripe. En démonstration, Stripe fonctionne en mode test : aucune transaction réelle.</p>
        <h3 style="margin:18px 0 8px">Données personnelles</h3>
        <p>Cette démonstration ne collecte ni ne transmet aucune donnée : réservations, panier et commandes restent dans votre navigateur (stockage local) et disparaissent à volonté.</p>
        <h3 style="margin:18px 0 8px">Propriété</h3>
        <p>Maquette réalisée par BeYours. Marques, plats, prix et photographies sont des exemples destinés à présenter le design du site.</p>
        <div class="hero-actions" style="margin-top:24px"><a class="btn btn-p" href="${href("home")}">Retour à l'accueil</a></div>
      </div>`);
  }

  /* ══════════ Boot ══════════ */
  applyTheme();
  injectFonts();
  initAnalytics();
  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    ({ home: pageHome, menu: pageMenu, about: pageAbout, contact: pageContact,
       locations: pageLocations, reserve: pageReserve, checkout: pageCheckout, success: pageSuccess,
       track: pageTrack, legal: pageLegal }[page] || pageHome)();
  });
})();
