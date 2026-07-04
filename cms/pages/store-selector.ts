import type { PageDefinition } from "@be-in-digital/cms"

export const storeSelectorPage: PageDefinition = {
  slug: "store-selector",
  label: "Sélection du magasin",
  groupId: "storefront",
  blocks: [
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
      label: "Aucun magasin",
      fields: {
        title: {
          type: "text",
          label: "Titre aucun magasin",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description aucun magasin",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
