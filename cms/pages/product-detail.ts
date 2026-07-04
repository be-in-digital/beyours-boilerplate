import type { PageDefinition } from "@be-in-digital/cms"
import { seoBlock } from "@be-in-digital/cms"

export const productDetailPage: PageDefinition = {
  slug: "product-detail",
  label: "Détail produit",
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
      key: "sections",
      label: "Sections",
      fields: {
        descriptionTitle: {
          type: "text",
          label: "Titre section description",
          maxLength: 100,
          hasCodeFallback: true,
        },
        optionsTitle: {
          type: "text",
          label: "Titre section options",
          maxLength: 100,
          hasCodeFallback: true,
        },
        similarTitle: {
          type: "text",
          label: "Titre produits similaires",
          maxLength: 100,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "actions",
      label: "Actions",
      fields: {
        addToCartLabel: {
          type: "text",
          label: "Texte ajouter au panier",
          maxLength: 50,
          hasCodeFallback: true,
        },
        outOfStockLabel: {
          type: "text",
          label: "Texte rupture de stock",
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
