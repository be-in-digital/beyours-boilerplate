import type { PageDefinition } from "@be-in-digital/cms"

export const signUpPage: PageDefinition = {
  slug: "sign-up",
  label: "Page d'inscription",
  groupId: "auth",
  blocks: [
    {
      key: "hero",
      label: "Section principale",
      fields: {
        title: {
          type: "text",
          label: "Titre",
          required: true,
          maxLength: 100,
          hasCodeFallback: true,
        },
        subtitle: {
          type: "richtext",
          label: "Sous-titre",
          maxLength: 500,
          hasCodeFallback: true,
        },
        image: {
          type: "image",
          label: "Image d'illustration",
          required: false,
          translatable: false,
          hasCodeFallback: true,
        },
      },
    },
    {
      key: "form",
      label: "Formulaire d'inscription",
      fields: {
        heading: {
          type: "text",
          label: "Titre du formulaire",
          required: true,
          maxLength: 100,
          hasCodeFallback: true,
        },
        submitLabel: {
          type: "text",
          label: "Texte du bouton",
          required: true,
          maxLength: 50,
          hasCodeFallback: true,
        },
        signinLink: {
          type: "text",
          label: "Texte lien connexion",
          maxLength: 100,
          hasCodeFallback: true,
        },
      },
    },
  ],
}
