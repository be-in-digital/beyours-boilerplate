import type { PageDefinition } from "@be-in-digital/cms"

export const cartPage: PageDefinition = {
  slug: "cart",
  label: "Panier",
  groupId: "order",
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
      label: "Panier vide",
      fields: {
        title: {
          type: "text",
          label: "Titre panier vide",
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Description panier vide",
          maxLength: 200,
          hasCodeFallback: true,
        },
        ctaLabel: {
          type: "text",
          label: "Texte bouton retour menu",
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "actions",
      label: "Actions",
      fields: {
        checkoutLabel: {
          type: "text",
          label: "Texte bouton valider",
          maxLength: 50,
          hasCodeFallback: true,
        },
        continueShopping: {
          type: "text",
          label: "Texte continuer les achats",
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
