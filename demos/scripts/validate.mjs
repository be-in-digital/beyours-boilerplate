#!/usr/bin/env node
/*
 * Validation des démos (hermétique, sans navigateur) — utilisée en CI.
 * Vérifie : 10 thèmes/catégorie · contraste AA des palettes · unicité de la
 * combinaison hero/carte par catégorie · présence des captures et pages de
 * partage · cohérence des prix (ids des packs présents dans api/checkout.js) ·
 * présence des coquilles de pages. Sort en erreur (exit 1) au moindre manquement.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const X = require(path.join(DIR, "assets", "themes.js"));

const errs = [];
const bad = (m) => errs.push(m);
const exists = (p) => fs.existsSync(path.join(DIR, p));

/* ── Contraste ── */
function rgb(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)]; }
function lum(c) { const t = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * t(c[0]) + 0.7152 * t(c[1]) + 0.0722 * t(c[2]); }
function ratio(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }
const P = (s) => { const m = s.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/); return rgb(+m[1], +m[2], +m[3]); };

/* ── 1. Comptage ── */
for (const c of X.ORDER) {
  const n = X.LIST.filter((t) => t.cat === c).length;
  if (n !== 10) bad(`Catégorie ${c} : ${n} thèmes (attendu 10)`);
}
if (X.LIST.length !== 50) bad(`${X.LIST.length} thèmes au total (attendu 50)`);

/* ── 2. Contraste AA + 3. unicité layout ── */
let pairs = 0;
for (const c of X.ORDER) {
  const combos = new Set();
  for (const t of X.LIST.filter((x) => x.cat === c)) {
    const combo = t.hero + "/" + t.menu;
    if (combos.has(combo)) bad(`Doublon de mise en page ${combo} dans ${c} (${t.id})`);
    combos.add(combo);
    for (const mode of ["L", "D"]) {
      const P_ = (k) => P(t[mode][k]);
      const checks = [["bg", "fg", 4.5], ["p", "pf", 4.5], ["a", "af", 4.5], ["bg", "p", 3]];
      for (const [x, y, min] of checks) {
        pairs++;
        const r = ratio(P_(x), P_(y));
        if (r < min) bad(`${t.id} ${mode === "L" ? "clair" : "sombre"} ${x}/${y} = ${r.toFixed(2)} (min ${min})`);
      }
    }
  }
}

/* ── 4. Captures + pages de partage + polices connues ── */
for (const t of X.LIST) {
  if (!exists(`assets/shots/${t.id}.jpg`)) bad(`Capture manquante : assets/shots/${t.id}.jpg`);
  if (!exists(`s/${t.id}.html`)) bad(`Page de partage manquante : s/${t.id}.html`);
  if (!X.PAIRINGS[t.fonts]) bad(`Paire de polices inconnue « ${t.fonts} » (${t.id})`);
}

/* ── 5. Cohérence des prix : chaque id de plat existe dans api/checkout.js ── */
const checkoutSrc = fs.readFileSync(path.join(DIR, "api", "checkout.js"), "utf8");
for (const c of X.ORDER) {
  for (const d of X.CATS[c].dishes) {
    if (!checkoutSrc.includes(`${d.id}:`)) bad(`Prix absent de api/checkout.js pour ${d.id} (${c})`);
  }
}

/* ── 6. Coquilles de pages ── */
for (const p of ["index", "home", "menu", "about", "contact", "locations", "reserve", "checkout", "success", "track", "legal", "admin"]) {
  if (!exists(`${p}.html`)) bad(`Coquille manquante : ${p}.html`);
}

if (errs.length) {
  console.error(`✗ Validation démos : ${errs.length} problème(s)\n` + errs.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ Démos OK : 50 thèmes, ${pairs} paires de contraste AA, combos hero/carte uniques, captures + partages + prix cohérents.`);
