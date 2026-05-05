import { httpRouter } from "convex/server"
import { authComponent, createAuth } from "./auth"

/**
 * Convex HTTP router.
 *
 * Better Auth routes are mounted with `cors: true` — the allowed origins
 * are derived from `trustedOrigins` in `auth.ts` (sourced from env var
 * SITE_URL). The boilerplate refuses to ship without an explicit SITE_URL
 * because guarding cross-origin requests is a hard security requirement
 * for the mobile bearer-token flow (see design doc: Constraint Guardian #9).
 *
 * For custom HTTP actions added later, validate the Origin header against
 * the same SITE_URL env var before processing the request.
 */
const http = httpRouter()

authComponent.registerRoutes(http, createAuth, {
  cors: true,
})

export default http

/**
 * Helper to be reused by future custom HTTP actions.
 *
 * Usage:
 *   if (!isAllowedOrigin(request)) return new Response("Forbidden", { status: 403 })
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  const siteUrl = process.env.SITE_URL
  if (!siteUrl || siteUrl === "*") {
    // Refuse to allow requests if SITE_URL is not configured.
    // This is intentional — `*` is never an acceptable value here.
    return false
  }
  const allowed = [siteUrl, "http://localhost:3000", "http://localhost:3001"]
  return allowed.includes(origin)
}
