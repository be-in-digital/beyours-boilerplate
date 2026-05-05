import { components } from "./_generated/api"
import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"

// Better Auth component client
export const authComponent = createClient<DataModel>(components.betterAuth)

// Better Auth server configuration.
//
// Session TTLs (Constraint Guardian #8 — bearer tokens for mobile must be bounded):
//   - access token TTL: 1 hour
//   - refresh / session expiry: 30 days, with rotation on each use
// These apply to both the cookie-based web flow (Next.js custom proxy) and
// the bearer-token mobile flow (@better-auth/expo + expo-secure-store).
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 // 1 hour
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24 // refresh after 1 day of activity

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
    },
    trustedOrigins: process.env.SITE_URL
      ? [process.env.SITE_URL, "http://localhost:3000", "http://localhost:3001"]
      : ["http://localhost:3000", "http://localhost:3001"],
    plugins: [
      convex({
        authConfig,
        jwt: { expirationSeconds: ACCESS_TOKEN_TTL_SECONDS },
      }),
    ],
  })
}

// Query to get the currently authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx)
  },
})

// Client API for AuthBoundary component
export const { getAuthUser } = authComponent.clientApi()
