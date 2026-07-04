/**
 * JSON-LD Schema.org builders
 *
 * Generates structured data for Google Rich Results.
 * Each builder returns a plain object ready for JSON.stringify.
 */

import "server-only"

interface StoreData {
  name: string
  slug: string
  description?: string | null
  address?: {
    street?: string
    city?: string
    postalCode?: string
    country?: string
  }
  phone?: string | null
  email?: string | null
}

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export function buildRestaurantSchema(store: StoreData, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: store.name,
    url: `${baseUrl}/s/${store.slug}`,
    ...(store.description ? { description: store.description } : {}),
    ...(store.phone ? { telephone: store.phone } : {}),
    ...(store.email ? { email: store.email } : {}),
    ...(store.address
      ? {
          address: {
            "@type": "PostalAddress",
            ...(store.address.street ? { streetAddress: store.address.street } : {}),
            ...(store.address.city ? { addressLocality: store.address.city } : {}),
            ...(store.address.postalCode ? { postalCode: store.address.postalCode } : {}),
            ...(store.address.country ? { addressCountry: store.address.country } : {}),
          },
        }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

interface MenuCategory {
  name: string
  slug: string
}

export function buildMenuSchema(
  store: StoreData,
  categories: MenuCategory[],
  baseUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menu - ${store.name}`,
    url: `${baseUrl}/s/${store.slug}/menu`,
    hasMenuSection: categories.map((cat) => ({
      "@type": "MenuSection",
      name: cat.name,
      url: `${baseUrl}/s/${store.slug}/menu/${cat.slug}`,
    })),
  }
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

interface ProductData {
  name: string
  slug: string
  description?: string | null
  price?: number | null
  imageUrl?: string | null
  available?: boolean
}

export function buildProductSchema(
  product: ProductData,
  store: StoreData,
  baseUrl: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url: `${baseUrl}/s/${store.slug}/product/${product.slug}`,
    ...(product.description ? { description: product.description } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    ...(product.price != null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "EUR",
            availability: product.available !== false
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

/**
 * Renders a JSON-LD script tag for embedding in a page.
 *
 * SECURITY NOTE: JSON.stringify does NOT escape the </script> sequence.
 * We sanitize the output to prevent XSS via script tag breakout.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape </script> to prevent script tag breakout XSS
  const jsonString = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  )
}
