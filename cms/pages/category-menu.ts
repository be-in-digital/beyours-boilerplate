import type { PageDefinition } from "@be-in-digital/cms"
import { seoBlock } from "@be-in-digital/cms"

export const categoryMenuPage: PageDefinition = {
  slug: "category-menu",
  label: "Menu par catégorie",
  groupId: "catalog",
  blocks: [
    seoBlock,
    {
      key: "header",
      label: "En-tête",
      fields: {
        title: {
          type: "text",
          label: "Titre générique",
          maxLength: 100,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "emptyState",
      label: "Catégorie vide",
      fields: {
        title: {
          type: "text",
          label: "Titre catégorie vide",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description catégorie vide",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
