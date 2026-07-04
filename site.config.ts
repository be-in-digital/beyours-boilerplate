/**
 * Configuration du site — ZONE CLIENT.
 *
 * Ce fichier appartient au site : il n'est JAMAIS écrasé par une mise à jour
 * du template ou de l'engine. C'est le point d'entrée unique pour l'identité
 * build-time du site (métadonnées, locale par défaut, hôtes d'images).
 *
 * Tout ce qui est modifiable par le restaurateur en production (horaires,
 * menus, textes, couleurs de sections CMS…) vit dans Convex (globalSettings /
 * CMS) et s'édite depuis le dashboard admin — pas ici.
 */

export const siteConfig = {
  /** Nom public du restaurant / du site. Utilisé dans <title>, OG, emails de base. */
  name: "Mon Restaurant",

  /** Description par défaut (SEO / Open Graph). */
  description: "Commande en ligne, click & collect et livraison.",

  /** Template de titre pour les pages internes. `%s` = titre de la page. */
  titleTemplate: "%s — Mon Restaurant",

  /**
   * URL canonique du site en production.
   * En local, NEXT_PUBLIC_APP_URL prime (définie dans .env.local).
   */
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  /** Locale par défaut quand le visiteur n'a pas encore choisi (cookie beid_locale). */
  defaultLocale: "fr",

  images: {
    /**
     * Hôtes distants autorisés pour next/image.
     * Ajouter ici le bucket S3 du client et tout CDN utilisé.
     */
    remoteHosts: [
      "images.unsplash.com",
      "i.pravatar.cc",
      "**.s3.eu-west-3.amazonaws.com",
    ],
  },
} as const

export type SiteConfig = typeof siteConfig
