import type { PageDefinition } from "@be-in-digital/cms"

export const accountFavoritesPage: PageDefinition = {
  slug: "account-favorites",
  label: "Produits favoris",
  groupId: "account",
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
      label: "Aucun favori",
      fields: {
        title: {
          type: "text",
          label: "Titre aucun favori",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description aucun favori",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
