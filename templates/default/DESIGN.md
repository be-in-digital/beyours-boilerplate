# Neutre (défaut engine)

Le thème d'origine de l'engine, tel quel : accent orange (`24 95% 53%`),
neutres froids, Inter pour le texte et Poppins pour les titres.

Ce « template » sert à deux choses :

1. **Point de départ vierge** pour un site dont l'identité sera construite
   entièrement sur mesure dans `site/theme.css`.
2. **Restauration** : `pnpm template:apply default` remet `site/theme.css` et
   `site/fonts.ts` dans leur état d'origine si un template appliqué ne
   convient pas.

Aucune direction artistique n'est imposée ici. Pour un site client réel,
préférer un des templates verticaux (`pizzeria`, `fast-food`, `food-truck`,
`poulet`, `asiatique`) puis ajuster les couleurs, ou repartir de ce neutre en
suivant les recettes de `docs/CUSTOMIZATION.md`.
