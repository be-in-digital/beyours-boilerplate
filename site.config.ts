/**
 * Site configuration — CLIENT ZONE.
 *
 * This file belongs to the site: it is NEVER overwritten by a template or
 * engine update. It is the single entry point for the site's build-time
 * identity (metadata, default locale, image hosts).
 *
 * Everything the restaurant owner can change in production (opening hours,
 * menus, copy, CMS section colors, and so on) lives in Convex (globalSettings /
 * CMS) and is edited from the admin dashboard — not here.
 */

export const siteConfig = {
  /** Public name of the restaurant / site. Used in <title>, OG tags, base emails. */
  name: "Mon Restaurant",

  /** Default description (SEO / Open Graph). */
  description: "Commande en ligne, click & collect et livraison.",

  /** Title template for inner pages. `%s` = the page title. */
  titleTemplate: "%s — Mon Restaurant",

  /**
   * Canonical site URL in production.
   * Locally, NEXT_PUBLIC_APP_URL takes precedence (set in .env.local).
   */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  /** Default locale before the visitor has picked one (beid_locale cookie). */
  defaultLocale: "fr",

  images: {
    /**
     * Remote hosts allowed for next/image.
     * Add the client's S3 bucket and any CDN in use here.
     */
    remoteHosts: [
      "images.unsplash.com",
      "i.pravatar.cc",
      "**.s3.eu-west-3.amazonaws.com",
    ],
  },
} as const

export type SiteConfig = typeof siteConfig
