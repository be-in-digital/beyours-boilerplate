import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Bug de type dans @be-in-digital/admin (zod v4 + @hookform/resolvers)
    // A retirer quand le package sera mis a jour
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@be-in-digital/core",
    "@be-in-digital/ui",
    "@be-in-digital/admin",
    "@be-in-digital/themes",
    "@be-in-digital/restaurant",
    "@be-in-digital/convex-schema",
    "@be-in-digital/convex-functions",
    "@convex-dev/better-auth",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.s3.eu-west-3.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
