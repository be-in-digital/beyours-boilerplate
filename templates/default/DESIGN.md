# Neutral (engine default)

The engine's original theme, exactly as it ships: orange accent
(`24 95% 53%`), cold neutrals, Inter for body text and Poppins for headings.

This "template" serves two purposes:

1. **A blank starting point** for a site whose identity will be built entirely
   by hand in `site/theme.css`.
2. **Restoration**: `pnpm template:apply default` puts `site/theme.css` and
   `site/fonts.ts` back in their original state if an applied template turns
   out to be wrong.

No art direction is imposed here. For a real client site, prefer one of the
vertical templates (`pizzeria`, `fast-food`, `food-truck`, `poulet`,
`asiatique`) and then adjust the colors, or start again from this neutral one
following the recipes in `docs/CUSTOMIZATION.md`.
