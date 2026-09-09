#!/usr/bin/env node
/*
 * Generates the templates/ catalogue from the demo identities
 * (demos/assets/themes.js), so that "what we show" (50 demos) and "what we
 * install" (templates/ applied to a real site) stay aligned.
 *
 * Produces a templates/<themeId>/ folder { theme.css, fonts.ts, template.json,
 * DESIGN.md } for every theme that is NOT the first of its category (those
 * five are already covered by the historical slugs pizzeria, fast-food,
 * food-truck, poulet, asiatique — left untouched).
 *
 * - theme.css: light/dark tokens + sidebar + radius, derived exactly the way
 *   the demo engine does it (card/secondary/muted/border by mixing).
 * - fonts.ts: the right next/font pair (explicit weights for non-variable
 *   fonts), variables --font-inter (body) / --font-poppins (headings) — the
 *   engine contract. Passes `pnpm typecheck`.
 *
 * Language note: everything the generator emits — theme.css and fonts.ts
 * header comments, template.json `label`/`description`, DESIGN.md — is
 * written in English. The source identities in demos/assets/themes.js are
 * French and stay French (they feed the sales demos); they are translated on
 * the way out through the *_EN tables below. The one exception is
 * template.json `category`, which keeps the demo catalogue's own label so the
 * two stay in step.
 *
 * Regenerate: node scripts/gen-templates.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const X = require(path.join(ROOT, "demos", "assets", "themes.js"));
const fontData = require(path.join(ROOT, "node_modules", "next", "dist", "compiled", "@next", "font", "dist", "google", "font-data.json"));

/* ── Color ── */
const P = (s) => { const m = s.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/); return { h: +m[1], s: +m[2], l: +m[3] }; };
const F = (c) => `${Math.round(c.h)} ${Math.round(c.s)}% ${Math.round(c.l)}%`;
const Fh = (c) => `hsl(${F(c)})`;
const mix = (a, b, t) => ({ h: a.h + (b.h - a.h) * t, s: a.s + (b.s - a.s) * t, l: a.l + (b.l - a.l) * t });
const clampL = (c, lo, hi) => ({ h: c.h, s: c.s, l: Math.max(lo, Math.min(hi, c.l)) });

/* ── Contrast ──
 *
 * WHY THE GENERATOR MEASURES ITS OWN OUTPUT NOW. #436 fixed the catalogue by
 * hand — 51 `theme.css` files, `--input` lifted off `--border`, `--muted`
 * separated from `--muted-foreground` — and did NOT touch this script. So this
 * script went on emitting the pre-#436 arithmetic, and `node
 * scripts/gen-templates.mjs` silently reverted the whole fix: measured on the
 * tree at `b9e20ea`, a regeneration rewrote 164 lines across 45 templates,
 * putting `--input` back onto `--border` in all of them. That is the defect
 * `globals.css` describes as "the product was, to a low-vision user, a
 * rectangle that was not there", restored by running a maintenance command.
 *
 * Derived rather than transcribed, for that reason: a constant copied out of a
 * fixed file drifts the moment the file is fixed again. A rule that walks until
 * it MEASURES a pass cannot.
 */
const srgb = (v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : (((v / 255) + 0.055) / 1.055) ** 2.4);
function rgbOf({ h, s, l }) {
  const S = s / 100, L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = L - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}
const luminance = (c) => { const [r, g, b] = rgbOf(c); return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b); };
const ratio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/**
 * Walk `colour`'s lightness away from `dark ? white : black` until it clears
 * `floor` against every ground in `grounds`.
 *
 * Half a point at a time, hue and saturation untouched: the template's identity
 * is its hue, and the only thing a contrast failure ever needs is lightness.
 * Returns the input unchanged when it already passes, so a sound palette is
 * emitted exactly as it was derived.
 */
function readable(colour, grounds, floor, dark) {
  // Measured on the value that will actually be WRITTEN, not on the one being
  // considered: `F()` rounds to whole degrees and percents, so a candidate that
  // clears the floor at 51.5% can be emitted as 52% and land back under it.
  // Rounding first is what makes the emitted stylesheet the thing that passed.
  const round = (c) => ({ h: Math.round(c.h), s: Math.round(c.s), l: Math.round(c.l) });
  const rounded = grounds.map(round);
  const step = dark ? 1 : -1;
  let l = Math.round(colour.l);
  for (let i = 0; i <= 200; i++) {
    const candidate = { h: Math.round(colour.h), s: Math.round(colour.s), l };
    if (rounded.every((g) => ratio(candidate, g) >= floor)) return candidate;
    l += step;
    if (l < 0 || l > 100) break;
  }
  return { h: Math.round(colour.h), s: Math.round(colour.s), l: Math.max(0, Math.min(100, l)) };
}

/**
 * A margin over the WCAG floor, not the floor itself.
 *
 * A value that measures exactly 4.500 passes today and fails on the next
 * rounding change anywhere in the chain. Half a tenth costs nothing visible.
 */
const TEXT = 4.6;   // WCAG 2.1 AA, normal text
const NON_TEXT = 3.1; // WCAG 2.1 1.4.11, a control boundary

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
  /*
   * `--input` is the BOUNDARY OF EVERY FORM FIELD, and WCAG 1.4.11 asks 3:1 of
   * it because a user has to find the field. It used to be emitted as
   * `--border` — a decorative separator, which 1.4.11 does not reach — and 51
   * templates shipped fields whose edge measured 1.09–1.21:1.
   */
  const input = readable(border, [bg], NON_TEXT, dark);

  /*
   * `--muted-foreground` is the quietest ink in the product and the most
   * written: 952 places, on four different surfaces. `mix(fg, bg, 0.34)` puts
   * it a third of the way to the page, which lands between 3.05:1 and 3.26:1 on
   * a warm template — well under AA for body text. #436 corrected it by hand in
   * 32 places and this script reverted all 32 the next time it ran.
   *
   * Corrected FIRST, because `--muted` is then separated from whatever this
   * settles on; doing it the other way round chases its own tail.
   */
  const mutedInk = readable(mutedFg, [bg, card, sec, a], TEXT, dark);

  /*
   * `--muted` is emitted as `--secondary`, and `--muted-foreground` is written
   * on it. Separated here until the pair clears AA rather than left to chance.
   */
  const muted = readable(sec, [mutedInk], TEXT, !dark);

  /*
   * `--primary-ink`: the brand colour a WORD is written in, as opposed to the
   * one a BUTTON is filled with. `globals.css` has carried this split since
   * #410 — "text-primary-ink, never text-primary, for a word" — and NO template
   * declared it, so all 51 fell back to the engine's orange while overriding
   * `--primary` to their own hue. Any markup still writing `text-primary` then
   * met the template's FILL colour: 20 of the 51 failed AA that way, worst
   * 3.02:1 on `asiatique-dragon`.
   *
   * Derived from this template's own primary so the brand survives, walked
   * until it can be read on every surface a word lands on.
   */
  const primaryInk = readable(p, [bg, card, muted, a], TEXT, dark);

  return { bg, fg, p, pf, a, af, card, sec, mutedFg: mutedInk, border, input, muted, primaryInk, dark, chart };
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
  --primary-ink: ${F(d.primaryInk)};
  --secondary: ${F(d.sec)};
  --secondary-foreground: ${F(d.fg)};
  --muted: ${F(d.muted)};
  --muted-foreground: ${F(d.mutedFg)};
  --accent: ${F(d.a)};
  --accent-foreground: ${F(d.af)};
  --border: ${F(d.border)};
  --input: ${F(d.input)};
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

/* ── Fonts ── */
const family = (css) => (css.match(/'([^']+)'/) || [])[1];
const exportName = (fam) => fam.replace(/ /g, "_");
function fontSpec(fam) {
  const d = fontData[fam];
  const variable = d.weights.includes("variable");
  return { exp: exportName(fam), variable, weights: d.weights.filter((w) => w !== "variable") };
}
// Compact weight sets for non-variable fonts (all of them exist, cf font-data)
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
 * Template fonts — CLIENT ZONE once applied (generated from the demo
 * identities, cf scripts/gen-templates.mjs).
 *
 * Headings: ${hFam}. Body: ${bFam}.
 * Engine contract: keep the --font-inter (body) and --font-poppins (headings)
 * variables, they are referenced by app/globals.css.
 */
import { ${imports} } from "next/font/google"

const body = ${b.exp}(${opt(bFam, b, "--font-inter")})

const heading = ${h.exp}(${opt(hFam, h, "--font-poppins")})

export const fontVariables = \`\${body.variable} \${heading.variable}\`
`;
}

/* ── Generation ── */

/* Layout wording for template.json `description` and DESIGN.md, keyed by the
 * hero / menu family ids of demos/assets/themes.js (which names them in
 * French). Every id in use must have an entry — the fallback prints the raw
 * id. */
const HERO_EN = { editorial: "editorial (round photo, story)", fullbleed: "full-bleed image", poster: "typographic poster", split: "text / photo split", board: "board of locations", magazine: "magazine", zen: "pared back, airy", banner: "straight banner", collage: "collage", duo: "color / photo diagonal" };
const MENU_EN = { dotted: "typeset with dot leaders", tickets: "stacked tickets", cards: "photo cards", zen: "single column, hairline rules", mosaic: "photo mosaic", ledger: "numbered ledger", tabs: "sticky tabs", bento: "bento" };

/* Category labels, keyed by category id. The French labels in
 * demos/assets/themes.js keep feeding template.json `category` unchanged, so
 * the installed catalogue and the demo gallery stay in step. */
const CAT_EN = { pizzeria: "Pizzeria", "fast-food": "Fast food", "food-truck": "Food truck", poulet: "Chicken", asiatique: "Asian" };

/* Baselines. The French originals live in demos/assets/themes.js (`tag`);
 * these are their English counterparts, keyed by theme id. A theme with no
 * entry falls back to the French baseline. */
const TAG_EN = {
  "pizzeria-verace": "Neapolitan pizza, basta",
  "pizzeria-fornonero": "Embers, ash and flour",
  "pizzeria-milano": "Editorial, like a magazine",
  "pizzeria-golfo": "The Amalfi coast, at the table",
  "pizzeria-rustica": "Country pizzeria",
  "pizzeria-doppiozero": "00 flour, zero-frills design",
  "pizzeria-vesuvio": "The pizza that rumbles",
  "pizzeria-basilico": "Green, fresh, vegetable-led",
  "pizzeria-notte": "The late-night slice",
  "fast-food-dinerclassic": "The American diner, 2026 edition",
  "fast-food-grill77": "Charcoal, flame, full stop",
  "fast-food-verte": "Fast food with a clear conscience",
  "fast-food-boxx": "Burgers in a box, design in blocks",
  "fast-food-minuit": "The burger after the party",
  "fast-food-fermier": "From the field to the bun",
  "fast-food-stacked": "The burger, front page",
  "fast-food-drivein": "Orders on wheels since 1987",
  "fast-food-prime": "The butcher's burger",
  "food-truck-routier": "Modern roadside stop, old-school portions",
  "food-truck-tacoloco": "Street tacos, real salsa",
  "food-truck-seoulstreet": "Korean street food, low fire and gochujang",
  "food-truck-greenwheels": "A 100% plant-based truck",
  "food-truck-braisenroute": "Smoked BBQ, black trailer",
  "food-truck-lamarina": "The sea, curbside",
  "food-truck-pitstop": "Express refueling",
  "food-truck-boheme": "The van that follows the sun",
  "food-truck-nordique": "Scandinavian truck, black bread",
  "poulet-coqdor": "Neighborhood rotisserie since 1962",
  "poulet-krispy": "Crunch turned all the way up",
  "poulet-seoulfried": "K-chicken, double-fried",
  "poulet-fermierchic": "Raised outside, roasted inside",
  "poulet-piriwest": "Piri-piri, embers and lemon",
  "poulet-bouillon": "Poule au pot and roast poultry",
  "poulet-wingsclub": "The wing club, game included",
  "poulet-hotcluck": "Nashville hot, concrete edition",
  "poulet-dimanche": "The meal that brings everyone together",
  "asiatique-wokstreet": "High flame, a wok that cracks",
  "asiatique-bambou": "Gentle steam, fresh bamboo",
  "asiatique-tokyonight": "Midnight ramen bar",
  "asiatique-hanoi": "Bowls and chopsticks from Indochina",
  "asiatique-sichuan": "Pepper that numbs, heat that wakes",
  "asiatique-matcha": "Tea room and small plates",
  "asiatique-dragon": "Cantonese banquet, lacquer and gold",
  "asiatique-banhmi": "Crisp baguette, Vietnamese heart",
  "asiatique-omakase": "We choose for you",
};

/* Two wording warts this generator used to emit, keep them fixed:
 * - a baseline that already ends in a period doubled the dot in `description`
 *   ("Charcoal, flame, full stop.. numbered ledger");
 * - a lead-in word in front of a label that starts with the same word read as
 *   a stutter ("carte carte typographiée"). */
const noDot = (s) => s.replace(/\s*\.\s*$/, "");
const lead = (word, label) =>
  label.toLowerCase().startsWith(word.toLowerCase()) ? label : `${word} ${label}`;

let n = 0;
for (const c of X.ORDER) {
  const themes = X.LIST.filter((t) => t.cat === c);
  for (let i = 1; i < themes.length; i++) { // 0 = already covered by the historical slug
    const t = themes[i];
    const dir = path.join(ROOT, "templates", t.id);
    fs.mkdirSync(dir, { recursive: true });
    const brand = t.brand[0] + t.brand[1];
    const catLabel = X.CATS[t.cat].label;
    const catEn = CAT_EN[t.cat] || catLabel;
    const tagEn = noDot(TAG_EN[t.id] || t.tag);

    const css = `/*
 * Template "${t.name}" (${catEn}) — becomes site/theme.css once applied.
 * CLIENT ZONE: tune the client's colors here, --primary, --ring and --accent
 * first. Generated from the "${t.id}" demo identity
 * (scripts/gen-templates.mjs). HSL without hsl(), the globals.css contract.
 */

${tokenBlock(":root", t.L)}

${tokenBlock(".dark", t.D)}

/* Admin sidebar (full hsl() format, the globals.css contract) */
${sidebarBlock(":root", t.L)}

${sidebarBlock(".dark", t.D)}

/* Shape language */
:root {
  --radius: ${t.radius};
}
`;
    fs.writeFileSync(path.join(dir, "theme.css"), css);
    fs.writeFileSync(path.join(dir, "fonts.ts"), fontsTs(t.fonts, X.PAIRINGS[t.fonts]));
    fs.writeFileSync(path.join(dir, "template.json"), JSON.stringify({
      slug: t.id, category: catLabel, themeName: t.name,
      label: `${t.name} — ${tagEn}`,
      description: `${tagEn}. ${lead("Menu", MENU_EN[t.menu] || t.menu)}, ${lead("hero", HERO_EN[t.hero] || t.hero)}.`,
      primary: `hsl(${t.L.p})`, fonts: { heading: family(X.PAIRINGS[t.fonts].h), body: family(X.PAIRINGS[t.fonts].b) },
      demo: `demos/home.html?t=${t.id}`,
    }, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "DESIGN.md"), `# ${t.name} — ${catEn}

${tagEn}. Demo brand: **${brand}**.

Identity: ${family(X.PAIRINGS[t.fonts].h)} for headings, ${family(X.PAIRINGS[t.fonts].b)} for body text;
signature ${`hsl(${t.L.p})`}; demo layout "hero: ${HERO_EN[t.hero] || t.hero} / menu: ${MENU_EN[t.menu] || t.menu}".

Interactive preview of the full design: \`demos/home.html?t=${t.id}\` (or the
\`demos/index.html\` gallery). This template ships the **palette and the
fonts**; the demo's multi-page layout is what the engine side aims at.

## Adapting to the client
1. \`--primary\` + \`--ring\` + \`--sidebar-primary\`: the client's signature
   color (keep AA contrast against \`--primary-foreground\`).
2. \`--accent\` / \`--accent-foreground\`: same hue, diluted for backgrounds,
   darkened for text.
3. Semantic tokens (\`--success\`, \`--warning\`, \`--destructive\`,
   \`--status-*\`): left to the engine, do not redefine them.
`);
    n++;
  }
}
console.log(`${n} templates generated in templates/ (the 5 historical ones + default are left untouched).`);
