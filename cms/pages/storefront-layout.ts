import type { PageDefinition } from "@be-in-digital/cms"
import { seoBlock } from "@be-in-digital/cms"

export const storefrontLayoutPage: PageDefinition = {
  slug: "storefront-layout",
  label: "Layout du storefront",
  description: "En-tête et pied de page communs à toutes les pages du storefront",
  groupId: "storefront",
  blocks: [
    seoBlock,
    {
      key: "branding",
      label: "Identité visuelle",
      fields: {
        logo: {
          type: "image",
          label: "Logo du restaurant",
          description: "Utilisé dans l'en-tête du storefront et le tableau de bord admin. Recommandé : PNG/SVG transparent, 200x60px minimum.",
          hasCodeFallback: true,
        },
        favicon: {
          type: "image",
          label: "Favicon",
          description: "Icône du navigateur. Recommandé : PNG carré 32x32px ou 64x64px.",
          hasCodeFallback: true,
        },
        brandName: {
          type: "text",
          label: "Nom de la marque",
          description: "Affiché si aucun logo n'est défini. Utilisé aussi comme alt text du logo.",
          required: true,
          maxLength: 50,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "header",
      label: "En-tête du site",
      fields: {
        brandName: {
          type: "text",
          label: "Nom de la marque (header)",
          required: true,
          maxLength: 50,
          hasCodeFallback: true,
        },
        menuLabel: {
          type: "text",
          label: "Texte lien menu",
          maxLength: 30,
          hasCodeFallback: true,
        },
        cartLabel: {
          type: "text",
          label: "Texte lien panier",
          maxLength: 30,
          hasCodeFallback: true,
        },
        accountLabel: {
          type: "text",
          label: "Texte lien mon compte",
          maxLength: 30,
          hasCodeFallback: true,
        },
        signinLabel: {
          type: "text",
          label: "Texte lien connexion",
          maxLength: 30,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "footer",
      label: "Pied de page",
      fields: {
        poweredBy: {
          type: "text",
          label: "Texte Powered by",
          maxLength: 100,
          hasCodeFallback: true,
        },
        copyrightText: {
          type: "text",
          label: "Texte de copyright",
          maxLength: 200,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
