/**
 * The application's Content-Security-Policy.
 *
 * There was none. The header block next to it set five other security headers,
 * so the omission read like a decision rather than a gap.
 *
 * What this policy is, and is not
 * -------------------------------
 * `script-src` still carries `'unsafe-inline'`. Next.js bootstraps hydration
 * from inline `<script>` tags, and the alternative — a per-request nonce — has
 * to be minted in middleware, which opts every page out of static rendering.
 * That is a rendering-architecture decision, not a security fix, and it is not
 * made here.
 *
 * So this policy does not stop injected inline script. What it does stop is
 * cheap and worth having: `<base>` hijacking, plugin and object embedding,
 * framing by another site, and forms that post somewhere else.
 *
 * It is deliberately not the control that closes the stored-XSS report. That
 * one is `buildFileResponseHeaders` in `lib/services/file-serving.ts`, which
 * puts `default-src 'none'; sandbox` on every proxied upload — a strict policy,
 * on the only responses whose bodies a user supplied, needing no nonce.
 */

/**
 * Directives whose values do not change between environments.
 *
 * `connect-src` stays open to `https:`/`wss:`: the Convex deployment URL is a
 * per-client runtime value, and `headers()` is evaluated at build time, so
 * pinning it here would bake one client's backend into another client's build.
 */
const BASE_DIRECTIVES: Record<string, string[]> = {
  "default-src": ["'self'"],
  // Blocks a <base> tag redirecting every relative URL on the page.
  "base-uri": ["'self'"],
  // No <object>/<embed>: legacy plugin content is a scripting surface.
  "object-src": ["'none'"],
  // Same intent as the X-Frame-Options: DENY alongside it, for browsers that
  // prefer CSP.
  "frame-ancestors": ["'none'"],
  // An injected form cannot post the page's fields to another origin.
  "form-action": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "media-src": ["'self'", "blob:", "https:"],
  "frame-src": ["'self'", "https:"],
  "worker-src": ["'self'", "blob:"],
  "manifest-src": ["'self'"],
}

export function buildContentSecurityPolicy(options: {
  isDevelopment: boolean
}): string {
  const directives: Record<string, string[]> = {
    ...BASE_DIRECTIVES,
    // 'unsafe-eval' is the dev server's: React Refresh and the Turbopack
    // runtime evaluate modules. A production build does not, so it is not
    // granted there.
    "script-src": options.isDevelopment
      ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
      : ["'self'", "'unsafe-inline'"],
    // ws: is the HMR socket.
    "connect-src": options.isDevelopment
      ? ["'self'", "https:", "wss:", "ws:"]
      : ["'self'", "https:", "wss:"],
  }

  return Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ")
}
