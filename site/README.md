# `site/` — the client zone

Everything specific to THIS site lives here (plus `site.config.ts` and the
`.env*` files at the root). **Nothing in this directory is touched by template
or engine updates.**

| File / directory    | Role                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `../site.config.ts` | Build-time identity: name, SEO, default locale, image hosts       |
| `theme.css`         | Design token overrides (colors, radius, and so on)                |
| `fonts.ts`          | Site fonts (next/font)                                            |
| `components/`       | Custom components for this site                                   |
| `public/` (root)    | Logos, favicon, images — replace the existing files               |

## Golden rule

**Never** modify `app/`, `components/`, `lib/`, `hooks/`, `cms/` or
`convex/`: those areas belong to the engine and are overwritten or merged on
every update. If a customization looks impossible from `site/`, the admin
dashboard (CMS, settings) or `site.config.ts`, then it is an engine change —
open a ticket on `be-in-digital/beyours`.

Details: `docs/CUSTOMIZATION.md`.
