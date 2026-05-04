/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"

// Lazy singleton for server-side auth utilities (getToken, isAuthenticated, etc.)
// Note: the handler is NOT used — see app/api/auth/[...all]/route.ts for the custom proxy.
let _auth: any
function auth() {
  if (!_auth) {
    _auth = convexBetterAuthNextJs({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
      convexSiteUrl: process.env.CONVEX_SITE_URL!,
    } as any)
  }
  return _auth
}

export const getToken = (...args: any[]) => auth().getToken(...args)
export const isAuthenticated = (...args: any[]) =>
  auth().isAuthenticated(...args)
export const preloadAuthQuery = (...args: any[]) =>
  auth().preloadAuthQuery(...args)
export const fetchAuthQuery = (...args: any[]) =>
  auth().fetchAuthQuery(...args)
export const fetchAuthMutation = (...args: any[]) =>
  auth().fetchAuthMutation(...args)
export const fetchAuthAction = (...args: any[]) =>
  auth().fetchAuthAction(...args)
