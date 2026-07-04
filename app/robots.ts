/**
 * robots.txt
 *
 * Allow /s/ (storefront), disallow admin/preview/api.
 * References the sitemap.
 */

import type { MetadataRoute } from "next"

function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, "")
  return "https://localhost:3000"
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/s/",
        disallow: [
          "/preview/",
          "/dashboard/",
          "/api/",
          "/sign-in",
          "/sign-up",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
