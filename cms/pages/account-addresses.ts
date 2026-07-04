import type { PageDefinition } from "@be-in-digital/cms"

export const accountAddressesPage: PageDefinition = {
  slug: "account-addresses",
  label: "Adresses sauvegardées",
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
      label: "Aucune adresse",
      fields: {
        title: {
          type: "text",
          label: "Titre aucune adresse",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description aucune adresse",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
