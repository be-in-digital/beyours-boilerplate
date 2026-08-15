#!/usr/bin/env node
/*
 * Génère demos/s/<themeId>.html : une page de partage par thème, avec balises
 * Open Graph / Twitter (titre, description, image = la capture du thème) et
 * redirection vers la démo. Objectif : quand on colle le lien d'un thème dans
 * WhatsApp / un e-mail / un SMS, l'aperçu affiche la vraie capture du site.
 *
 * Les URL d'image/redirection sont relatives à la racine du site (/assets…,
 * /home.html) : ça marche en local comme sur Vercel, sans connaître le domaine.
 *
 * Régénérer : node demos/scripts/gen-share.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const X = require(path.join(DIR, "assets", "themes.js"));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const outDir = path.join(DIR, "s");
fs.mkdirSync(outDir, { recursive: true });

let n = 0;
for (const t of X.LIST) {
  const brand = t.brand[0] + t.brand[1];
  const cat = X.CATS[t.cat].label;
  const title = `${brand} — ${t.tag}`;
  const desc = `Démo interactive d'un site restaurant : carte, commande et paiement de test, plusieurs pages. Design « ${t.name} » (${cat}). Par BeYours.`;
  const img = `/assets/shots/${t.id}.jpg`;
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — démo BeYours</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Démos BeYours">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${img}">
<meta property="og:image:width" content="840">
<meta property="og:image:height" content="525">
<meta property="og:url" content="/s/${t.id}.html">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${img}">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0;url=../home.html?t=${t.id}">
<script>location.replace("../home.html?t=${t.id}")</script>
</head>
<body style="font-family:system-ui;background:#0d0c0f;color:#eee;display:grid;place-items:center;height:100vh;margin:0">
<a href="../home.html?t=${t.id}" style="color:#f0803b">Ouvrir la démo ${esc(brand)} →</a>
</body>
</html>
`;
  fs.writeFileSync(path.join(outDir, `${t.id}.html`), html);
  n++;
}
console.log(`${n} pages de partage générées dans demos/s/`);
