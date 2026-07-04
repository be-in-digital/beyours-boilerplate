/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

// Lazy singleton to avoid throwing during Next.js build
// when CONVEX_SITE_URL is not available in the build environment.
let _auth: any;
function auth() {
  if (!_auth) {
    _auth = convexBetterAuthNextJs({
      convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
      convexSiteUrl: process.env.CONVEX_SITE_URL!,
      trustedOrigins: [
        process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
        "http://localhost:3001",
      ],
    } as any);
  }
  return _auth;
}

export const handler = {
  GET: (request: Request) => auth().handler.GET(request),
  POST: (request: Request) => auth().handler.POST(request),
};
export const getToken = (...args: any[]) => auth().getToken(...args);
export const isAuthenticated = (...args: any[]) => auth().isAuthenticated(...args);
export const preloadAuthQuery = (...args: any[]) => auth().preloadAuthQuery(...args);
export const fetchAuthQuery = (...args: any[]) => auth().fetchAuthQuery(...args);
export const fetchAuthMutation = (...args: any[]) => auth().fetchAuthMutation(...args);
export const fetchAuthAction = (...args: any[]) => auth().fetchAuthAction(...args);
