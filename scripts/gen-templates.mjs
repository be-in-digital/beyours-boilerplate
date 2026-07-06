#!/usr/bin/env node
/*
 * Génère le catalogue templates/ à partir des identités de démo
 * (demos/assets/themes.js), pour aligner « ce qu'on montre » (50 démos) et
 * « ce qu'on installe » (templates/ appliqués à un vrai site).
 *
 * Produit un dossier templates/<themeId>/ { theme.css, fonts.ts, template.json,
 * DESIGN.md } pour chaque thème qui n'est PAS le premier de sa catégorie (les
 * cinq premiers sont déjà couverts par les slugs historiques pizzeria,
 * fast-food, food-truck, poulet, asiatique — laissés intacts).
 *
 * - theme.css : tokens light/dark + sidebar + radius, dérivés exactement comme
 *   le moteur des démos (card/secondary/muted/border par mélange).
 * - fonts.ts : paire next/font correcte (poids explicite pour les polices non
 *   variables), variables --font-inter (texte) / --font-poppins (titres) —
 *   contrat de l'engine. Passe `pnpm typecheck`.
 *
 * Régénérer : node scripts/gen-templates.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const X = require(path.join(ROOT, "demos", "assets", "themes.js"));
const fontData = require(path.join(ROOT, "node_modules", "next", "dist", "compiled", "@next", "font", "dist", "google", "font-data.json"));

/* ── Couleur ── */
const P = (s) => { const m = s.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/); return { h: +m[1], s: +m[2], l: +m[3] }; };
const F = (c) => `${Math.round(c.h)} ${Math.round(c.s)}% ${Math.round(c.l)}%`;
const Fh = (c) => `hsl(${F(c)})`;
const mix = (a, b, t) => ({ h: a.h + (b.h - a.h) * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t });
const clampL = (c, lo, hi) => ({ h: c.h, s: c.s, l: Math.max(lo, Math.min(hi, c.l)) });

function derive(C) {
  const bg = P(C.bg), fg = P(C.fg), p = P(C.p), a = P(C.a), af = P(C.af), pf = P(C.pf);
  const dark = bg.l < 50;
  const card = { h: bg.h, s: bg.s, l: dark ? bg.l + 3.5 : Math.min(100, bg.l + 2) };
  const sec = mix(bg, fg, dark ? 0.09 : 0.06);
  const mutedFg = mix(fg, bg, dark ? 0.3 : 0.34);
  const border = mix(bg, fg, dark ? 0.13 : 0.12);
  const chart = [p,
    clampL({ h: (p.h + 150) % 360, s: 55, l: 0 }, dark ? 52 : 40, dark ? 58 : 46),
    clampL({ h: (p.h + 45) % 360, s: 70, l: 0 }, dark ? 55 : 48, dark ? 62 : 54),
    clampL({ h: (p.h + 200) % 360, s: 45, l: 0 }, dark ? 55 : 45, dark ? 60 : 50),
    clampL({ h: (p.h + 300) % 360, s: 50, l: 0 }, dark ? 58 : 50, dark ? 64 : 56)];
  return { bg, fg, p, pf, a, af, card, sec, mutedFg, border, dark, chart };
}
const tokenBlock = (sel, C) => {
  const d = derive(C);
  return `${sel} {
  --background: ${F(d.bg)};
  --foreground: ${F(d.fg)};
  --card: ${F(d.card)};
  --card-foreground: ${F(d.fg)};
  --popover: ${F(d.card)};
  --popover-foreground: ${F(d.fg)};
  --primary: ${F(d.p)};
  --primary-foreground: ${F(d.pf)};
  --secondary: ${F(d.sec)};
  --secondary-foreground: ${F(d.fg)};
  --muted: ${F(d.sec)};
  --muted-foreground: ${F(d.mutedFg)};
  --accent: ${F(d.a)};
  --accent-foreground: ${F(d.af)};
  --border: ${F(d.border)};
  --input: ${F(d.border)};
  --ring: ${F(d.p)};
  --chart-1: ${F(d.chart[0])};
  --chart-2: ${F(d.chart[1])};
  --chart-3: ${F(d.chart[2])};
  --chart-4: ${F(d.chart[3])};
  --chart-5: ${F(d.chart[4])};
}`;
};
const sidebarBlock = (sel, C) => {
  const d = derive(C);
  return `${sel} {
  --sidebar: ${Fh(d.card)};
  --sidebar-foreground: ${Fh(d.fg)};
  --sidebar-primary: ${Fh(d.p)};
  --sidebar-primary-foreground: ${Fh(d.pf)};
  --sidebar-accent: ${Fh(d.a)};
  --sidebar-accent-foreground: ${Fh(d.af)};
  --sidebar-border: ${Fh(d.border)};
  --sidebar-ring: ${Fh(d.p)};
}`;
};

/* ── Polices ── */
const family = (css) => (css.match(/'([^']+)'/) || [])[1];
const exportName = (fam) => fam.replace(/ /g, "_");
function fontSpec(fam) {
  const d = fontData[fam];
  const variable = d.weights.includes("variable");
  return { exp: exportName(fam), variable, weights: d.weights.filter((w) => w !== "variable") };
}
// Poids compacts pour les polices non variables (existent tous, cf font-data)
const FIX_WEIGHTS = {
  "Barlow Condensed": ["500", "600", "700", "800"], "Barlow": ["400", "500", "600", "700"],
  "Zen Kaku Gothic New": ["400", "500", "700", "900"], "Bebas Neue": ["400"], "Marcellus": ["400"],
  "Alfa Slab One": ["400"], "Libre Caslon Text": ["400", "700"], "Staatliches": ["400"],
  "Be Vietnam Pro": ["400", "500", "600", "700"], "Shippori Mincho": ["400", "500", "600", "700"],
  "Passion One": ["400", "700", "900"], "Saira Condensed": ["500", "600", "700", "800"],
  "Anton": ["400"], "Zen Old Mincho": ["400", "500", "700", "900"],
};
function fontsTs(pairKey, pair) {
  const hFam = family(pair.h), bFam = family(pair.b);
  const h = fontSpec(hFam), b = fontSpec(bFam);
  const opt = (fam, spec, cssVar) => {
    const lines = [`  variable: "${cssVar}",`, `  subsets: ["latin"],`, `  display: "swap",`];
    if (!spec.variable) lines.splice(1, 0, `  weight: ${JSON.stringify(FIX_WEIGHTS[fam] || spec.weights)},`);
    return `{\n${lines.join("\n")}\n}`;
  };
  const imports = [...new Set([b.exp, h.exp])].sort().join(", ");
  return `/**
 * Polices du template — ZONE CLIENT après application (généré depuis les
 * identités de démo, cf scripts/gen-templates.mjs).
 *
 * Titres : ${hFam}. Texte : ${bFam}.
 * Contrat engine : garder les variables --font-inter (texte) et
 * --font-poppins (titres), référencées par app/globals.css.
 */
import { ${imports} } from "next/font/google"

const body = ${b.exp}(${opt(bFam, b, "--font-inter")})

const heading = ${h.exp}(${opt(hFam, h, "--font-poppins")})

export const fontVariables = \`\${body.variable} \${heading.variable}\`
`;
}

/* ── Génération ── */
const HERO_FR = { editorial: "éditorial (photo ronde, récit)", fullbleed: "pleine image", poster: "affiche typographique", split: "duo texte / photo", board: "tableau des emplacements", magazine: "magazine", zen: "épuré, aéré", banner: "bandeau direct", collage: "collage", duo: "diagonale couleur / photo" };
const MENU_FR = { dotted: "carte typographiée (lignes de points)", tickets: "tickets empilés", cards: "cartes photo", zen: "colonne unique en filets fins", mosaic: "mosaïque photo", ledger: "registre numéroté", tabs: "onglets collants", bento: "bento" };

let n = 0;
for (const c of X.ORDER) {
  const themes = X.LIST.filter((t) => t.cat === c);
  for (let i = 1; i < themes.length; i++) { // 0 = déjà couvert par le slug historique
    const t = themes[i];
    const dir = path.join(ROOT, "templates", t.id);
    fs.mkdirSync(dir, { recursive: true });
    const brand = t.brand[0] + t.brand[1];
    const catLabel = X.CATS[t.cat].label;

    const css = `/*
 * Template « ${t.name} » (${catLabel}) — devient site/theme.css à l'application.
 * ZONE CLIENT : ajuster les couleurs du client ici, en priorité --primary,
 * --ring, --accent. Généré depuis l'identité de démo « ${t.id} »
 * (scripts/gen-templates.mjs). Format HSL sans hsl(), contrat de globals.css.
 */

${tokenBlock(":root", t.L)}

${tokenBlock(".dark", t.D)}

/* Sidebar admin (format hsl() complet, contrat de globals.css) */
${sidebarBlock(":root", t.L)}

${sidebarBlock(".dark", t.D)}

/* Langue de formes */
:root {
  --radius: ${t.radius};
}
`;
    fs.writeFileSync(path.join(dir, "theme.css"), css);
    fs.writeFileSync(path.join(dir, "fonts.ts"), fontsTs(t.fonts, X.PAIRINGS[t.fonts]));
    fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify({
      slug: t.id, category: catLabel, themeName: t.name,
      label: `${t.name} — ${t.tag}`, description: `${t.tag}. ${MENU_FR[t.menu] || t.menu}, hero ${HERO_FR[t.hero] || t.hero}.`,
      primary: `hsl(${t.L.p})`, fonts: { heading: family(X.PAIRINGS[t.fonts].h), body: family(X.PAIRINGS[t.fonts].b) },
      demo: `demos/home.html?t=${t.id}`,
    }, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "DESIGN.md"), `# ${t.name} — ${catLabel}

${t.tag}. Marque de démonstration : **${brand}**.

Identité : titres en ${family(X.PAIRINGS[t.fonts].h)}, texte en ${family(X.PAIRINGS[t.fonts].b)} ;
signature ${`hsl(${t.L.p})`} ; mise en page de démo « hero ${HERO_FR[t.hero] || t.hero}, carte ${MENU_FR[t.menu] || t.menu} ».

Aperçu interactif du design complet : \`demos/home.html?t=${t.id}\` (ou la
galerie \`demos/index.html\`). Ce template applique la **palette et les
polices** ; la mise en page multipage de la démo est la cible côté engine.

## Adapter au client
1. \`--primary\` + \`--ring\` + \`--sidebar-primary\` : la couleur signature du
   client (garder un contraste AA avec \`--primary-foreground\`).
2. \`--accent\` / \`--accent-foreground\` : même teinte, diluée en fond, foncée
   en texte.
3. Tokens sémantiques (\`--success\`, \`--warning\`, \`--destructive\`,
   \`--status-*\`) : laissés à l'engine, ne pas les redéfinir.
`);
    n++;
  }
}
console.log(`${n} templates générés dans templates/ (les 5 historiques + default sont laissés intacts).`);
