import type { PageDefinition } from "@be-in-digital/cms"

export const accountOrdersPage: PageDefinition = {
  slug: "account-orders",
  label: "Historique des commandes",
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
      label: "Aucune commande",
      fields: {
        title: {
          type: "text",
          label: "Titre aucune commande",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description aucune commande",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
