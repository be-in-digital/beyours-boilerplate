export type EnvVarConfig = {
  name: string
  required: boolean
  group: string
  description: string
  isPublic?: boolean
}

/**
 * Variables d'environnement utilisees cote Next.js uniquement (.env.local).
 *
 * Les variables utilisees uniquement par Convex (Stripe, Deliveroo, Uber Eats,
 * AWS, OPENAI_API_KEY, ENCRYPTION_KEY, etc.) ne sont pas listees ici car elles
 * doivent etre definies cote Convex via `pnpx convex env set <NAME> <VALUE>`.
 * Voir .env.example et scripts/setup-convex-env.sh.
 */
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
    name: "CONVEX_SITE_URL",
    required: true,
    group: "Convex",
    description: "URL du site Convex (server-side, pour Better Auth)",
  },
  {
    name: "NEXT_PUBLIC_CONVEX_SITE_URL",
    required: false,
    group: "Convex",
    description: "URL du site Convex (pour les HTTP actions cote client)",
    isPublic: true,
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

  // Admin
  {
    name: "NEXT_PUBLIC_ADMIN_PAGE_SIZE",
    required: false,
    group: "Admin",
    description: "Taille de page par defaut pour les tables admin (defaut: 15)",
    isPublic: true,
  },
  {
    name: "NEXT_PUBLIC_APP_VERSION",
    required: false,
    group: "Admin",
    description: "Version de l'app affichee dans le footer admin",
    isPublic: true,
  },

  // Google Maps
  {
    name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    required: false,
    group: "Google Maps",
    description: "Cle API Google Maps pour l'autocompletion d'adresses",
    isPublic: true,
  },

  // Stripe (cote client uniquement - le secret est sur Convex)
  {
    name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    required: false,
    group: "Stripe",
    description: "Cle publique Stripe pour les paiements cote client",
    isPublic: true,
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
