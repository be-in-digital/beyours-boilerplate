export type EnvVarConfig = {
  name: string
  required: boolean
  group: string
  description: string
  isPublic?: boolean
}

export const envConfig: EnvVarConfig[] = [
  // Convex
  {
    name: "NEXT_PUBLIC_CONVEX_URL",
    required: true,
    group: "Convex",
    description: "URL de votre instance Convex",
    isPublic: true,
  },
  {
    name: "CONVEX_DEPLOYMENT",
    required: true,
    group: "Convex",
    description: "Identifiant du deployment Convex",
  },
  {
    name: "NEXT_PUBLIC_CONVEX_SITE_URL",
    required: false,
    group: "Convex",
    description: "URL du site Convex (pour les HTTP actions)",
    isPublic: true,
  },
  {
    name: "CONVEX_SITE_URL",
    required: true,
    group: "Convex",
    description: "URL du site Convex (server-side, pour Better Auth)",
  },

  // Better Auth
  {
    name: "BETTER_AUTH_URL",
    required: true,
    group: "Better Auth",
    description: "URL de l'app (ex: http://localhost:3000)",
  },
  {
    name: "BETTER_AUTH_SECRET",
    required: true,
    group: "Better Auth",
    description: "Secret pour signer les sessions (generer avec openssl rand -hex 32)",
  },

  // Google Maps
  {
    name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    required: false,
    group: "Google Maps",
    description: "Cle API Google Maps pour l'autocompletion d'adresses",
    isPublic: true,
  },

  // AWS S3
  {
    name: "AWS_REGION",
    required: true,
    group: "AWS S3",
    description: "Region AWS (ex: eu-west-1)",
  },
  {
    name: "AWS_ACCESS_KEY_ID",
    required: true,
    group: "AWS S3",
    description: "Cle d'acces AWS",
  },
  {
    name: "AWS_SECRET_ACCESS_KEY",
    required: true,
    group: "AWS S3",
    description: "Cle secrete AWS",
  },
  {
    name: "AWS_S3_BUCKET_NAME",
    required: true,
    group: "AWS S3",
    description: "Nom du bucket S3",
  },

  // AWS SES
  {
    name: "AWS_SES_FROM_EMAIL",
    required: false,
    group: "AWS SES",
    description: "Email d'envoi verifie dans SES",
  },

  // OpenAI
  {
    name: "OPENAI_API_KEY",
    required: false,
    group: "OpenAI",
    description: "Cle API OpenAI pour la traduction automatique",
  },

  // Paiements
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    group: "Paiements",
    description: "Cle secrete Stripe",
  },
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: false,
    group: "Paiements",
    description: "Cle publique Stripe",
    isPublic: true,
  },
  {
    name: "SUMUP_API_KEY",
    required: false,
    group: "Paiements",
    description: "Cle API SumUp",
  },
  {
    name: "PAYPAL_CLIENT_ID",
    required: false,
    group: "Paiements",
    description: "Client ID PayPal",
  },
  {
    name: "SQUARE_ACCESS_TOKEN",
    required: false,
    group: "Paiements",
    description: "Token d'acces Square",
  },

  // Integrations
  {
    name: "UBER_EATS_API_KEY",
    required: false,
    group: "Integrations",
    description: "Cle API Uber Eats",
  },
  {
    name: "DELIVEROO_API_KEY",
    required: false,
    group: "Integrations",
    description: "Cle API Deliveroo",
  },
  {
    name: "UBER_DIRECT_CUSTOMER_ID",
    required: false,
    group: "Integrations",
    description: "Customer ID Uber Direct",
  },

  // Sentry
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    group: "Sentry",
    description: "DSN Sentry pour le monitoring",
    isPublic: true,
  },
]

export type MissingEnvVar = {
  name: string
  group: string
  description: string
  required: boolean
}

export function checkEnvVars(): MissingEnvVar[] {
  const missing: MissingEnvVar[] = []

  for (const envVar of envConfig) {
    const value = process.env[envVar.name]
    if (!value || value.trim() === "") {
      missing.push({
        name: envVar.name,
        group: envVar.group,
        description: envVar.description,
        required: envVar.required,
      })
    }
  }

  return missing
}
