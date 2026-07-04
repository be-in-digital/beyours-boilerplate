# `site/` — la zone du client

Tout ce qui est spécifique à CE site vit ici (plus `site.config.ts` et les
fichiers `.env*` à la racine). **Rien dans ce dossier n'est touché par les
mises à jour du template ou de l'engine.**

| Fichier / dossier   | Rôle                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `../site.config.ts` | Identité build-time : nom, SEO, locale par défaut, hôtes d'images |
| `theme.css`         | Surcharge des design tokens (couleurs, radius…)                   |
| `fonts.ts`          | Polices du site (next/font)                                       |
| `components/`       | Composants custom du site                                         |
| `public/` (racine)  | Logos, favicon, images — remplacez les fichiers existants         |

## Règle d'or

Ne modifiez **jamais** `app/`, `components/`, `lib/`, `hooks/`, `cms/` ou
`convex/` : ces zones appartiennent à l'engine et sont écrasées/fusionnées à
chaque mise à jour. Si une personnalisation semble impossible depuis `site/`,
le dashboard admin (CMS, réglages) ou `site.config.ts`, c'est une évolution à
faire dans l'engine — ouvrez un ticket sur `be-in-digital/beindigital-engine`.

Détails : `docs/CUSTOMIZATION.md`.
