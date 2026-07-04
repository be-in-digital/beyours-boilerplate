import type { PageDefinition } from "@be-in-digital/cms"
import { seoBlock } from "@be-in-digital/cms"

export const contactPage: PageDefinition = {
  slug: "contact",
  label: "Contact",
  groupId: "storefront",
  blocks: [
    seoBlock,
    {
      key: "hero",
      label: "Section hero",
      fields: {
        badge: {
          type: "text",
          label: "Badge en-tête",
          maxLength: 50,
          hasCodeFallback: true,
        },
        title: {
          type: "text",
          label: "Titre principal",
          maxLength: 120,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "text",
          label: "Sous-titre",
          maxLength: 300,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "form",
      label: "Formulaire",
      fields: {
        heading: {
          type: "text",
          label: "Titre du formulaire",
          maxLength: 120,
          hasCodeFallback: true,
        },
        description: {
          type: "text",
          label: "Description",
          maxLength: 300,
          hasCodeFallback: true,
        },
        submitLabel: {
          type: "text",
          label: "Texte du bouton",
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "info",
      label: "Informations de contact",
      fields: {
        addressTitle: {
          type: "text",
          label: "Titre adresse",
          maxLength: 50,
          hasCodeFallback: true,
        },
        hoursTitle: {
          type: "text",
          label: "Titre horaires",
          maxLength: 50,
          hasCodeFallback: true,
        },
        contactTitle: {
          type: "text",
          label: "Titre contact",
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
