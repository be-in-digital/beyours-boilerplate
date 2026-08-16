// PATCH BOILERPLATE vs engine:
//  1. transpilePackages extended — the @be-in-digital/* packages are installed
//     from GitHub Packages as TypeScript source (not as workspace packages),
//     so Next has to transpile them explicitly.
//  2. images.remotePatterns driven by site.config.ts (client zone).
import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "./site.config";

// engine-link mode (pnpm engine:link): the @be-in-digital/* packages are
// symlinks to a local clone outside the project. Turbopack rejects files
// outside the root — so we widen the tracing root to the common ancestor
// computed by scripts/engine-link.js. Without the marker file (normal
// registry mode, prod, CI), this block is inert.
const engineLinkMarker = join(__dirname, ".engine-link.json");
const engineLink = existsSync(engineLinkMarker)
  ? (JSON.parse(readFileSync(engineLinkMarker, "utf8")) as {
      tracingRoot: string;
    })
  : null;

const nextConfig: NextConfig = {
  ...(engineLink ? { outputFileTracingRoot: engineLink.tracingRoot } : {}),
  // App TypeScript errors fail the build (production safety). Convex backend
  // files are type-checked separately (`npx convex deploy`) and are already
  // excluded from this app's tsconfig (`exclude: ["convex"]`), so they are not
  // part of the Next.js build regardless of this flag.
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: [
    "@be-in-digital/admin",
    "@be-in-digital/cms",
    "@be-in-digital/convex-functions",
    "@be-in-digital/convex-schema",
    "@be-in-digital/core",
    "@be-in-digital/integrations",
    "@be-in-digital/marketing",
    "@be-in-digital/restaurant",
    "@be-in-digital/ui",
    "@convex-dev/better-auth",
  ],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: siteConfig.images.remoteHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
};

export default nextConfig;
