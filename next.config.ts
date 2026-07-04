// PATCH BOILERPLATE vs engine :
//  1. transpilePackages étendu — les packages @be-in-digital/* sont installés
//     depuis GitHub Packages en source TypeScript (pas en workspace), Next
//     doit donc les transpiler explicitement.
//  2. images.remotePatterns piloté par site.config.ts (zone client).
import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "./site.config";

// Mode engine-link (pnpm engine:link) : les packages @be-in-digital/* sont
// des symlinks vers un clone local hors du projet. Turbopack refuse les
// fichiers hors racine — on étend la racine de tracing à l'ancêtre commun
// calculé par scripts/engine-link.js. Sans marqueur (mode registre normal,
// prod, CI), ce bloc est inerte.
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
