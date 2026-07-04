import type { PageDefinition } from "@be-in-digital/cms"
import { seoBlock } from "@be-in-digital/cms"

export const menuPage: PageDefinition = {
  slug: "menu",
  label: "Page menu",
  groupId: "catalog",
  blocks: [
    seoBlock,
    {
      key: "header",
      label: "En-tête",
      fields: {
        title: {
          type: "text",
          label: "Titre",
          required: true,
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Sous-titre",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "emptyState",
      label: "État vide",
      fields: {
        title: {
          type: "text",
          label: "Titre quand aucun produit",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description quand aucun produit",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
