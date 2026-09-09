/**
 * Schema.org structured data for the storefront.
 *
 * This is what puts opening hours, an address and a price range beside the
 * restaurant in a search result, and what an answer engine reads when it is
 * asked whether the place is open on a Sunday. Every builder returns a plain
 * object; `JsonLd` renders one into the page.
 *
 * The shapes here are the ones Convex actually stores
 * (`packages/convex-schema/src/tables/stores.ts` and `.../catalog.ts`): an
 * address object, an hours array keyed by day number, prices in cents.
 */

import "server-only"

// ---------------------------------------------------------------------------
// Input shapes — mirrors of the Convex documents, narrowed to what SEO needs
// ---------------------------------------------------------------------------

export interface StoreAddressLike {
  street?: string
  city?: string
  postalCode?: string
  country?: string
  latitude?: number
  longitude?: number
}

export interface StoreHoursLike {
  /** 0 = Sunday … 6 = Saturday, as stored. */
  day: number
  /** "09:00" */
  open: string
  /** "22:00" */
  close: string
  isClosed: boolean
}

export interface StoreLike {
  name: string
  description?: string | null
  address?: StoreAddressLike | null
  hours?: readonly StoreHoursLike[] | null
  phone?: string | null
  email?: string | null
}

export interface MenuSectionLike {
  id: string
  /** The `?category=` value the menu page filters on. */
  slug: string
  name: string
  description?: string | null
}

export interface MenuItemLike {
  id: string
  name: string
  description?: string | null
  /** Cents, as stored. */
  price: number
  imageUrl?: string | null
  sectionId?: string | null
  available?: boolean
}

export interface BreadcrumbLike {
  name: string
  /** Absolute URL, or a path resolved against the base URL. */
  path: string
}

/** A JSON-LD document: JSON values only, nothing a `JSON.stringify` would drop. */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue }

export type JsonLdDocument = { [key: string]: JsonLdValue }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SCHEMA = "https://schema.org"

/** 0 = Sunday, matching the `day` field of the stored hours. */
const SCHEMA_DAYS = [
  `${SCHEMA}/Sunday`,
  `${SCHEMA}/Monday`,
  `${SCHEMA}/Tuesday`,
  `${SCHEMA}/Wednesday`,
  `${SCHEMA}/Thursday`,
  `${SCHEMA}/Friday`,
  `${SCHEMA}/Saturday`,
] as const

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function url(path: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`
}

function text(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Cents to the decimal string schema.org expects: 1250 → "12.50". */
function priceString(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2)
}

/**
 * Drops every `undefined` before the document is serialised.
 *
 * `JSON.stringify` already skips an undefined object value, but inside an array
 * it writes `null` instead — and a `null` in `hasMenuItem` is a malformed
 * document, not an empty one. Pruning once, here, is what keeps every builder
 * free to use conditional spreads.
 */
export function pruneUndefined(value: unknown): JsonLdValue | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    const items = value
      .map((entry) => pruneUndefined(entry))
      .filter((entry): entry is JsonLdValue => entry !== undefined)
    return items
  }
  if (typeof value === "object") {
    const result: { [key: string]: JsonLdValue } = {}
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const pruned = pruneUndefined(entry)
      if (pruned !== undefined) result[key] = pruned
    }
    return result
  }
  if (typeof value === "number" && !Number.isFinite(value)) return undefined
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }
  return undefined
}

/**
 * A price band from the catalogue itself, in the `€`-symbol form Google and
 * every listing site use. Undefined when the establishment has no priced
 * dishes — an invented band is worse than none.
 */
export function derivePriceRange(pricesInCents: readonly number[]): string | undefined {
  const prices = pricesInCents
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b)
  if (prices.length === 0) return undefined

  const median = prices[Math.floor(prices.length / 2)]!
  if (median < 1_000) return "€"
  if (median < 2_000) return "€€"
  if (median < 4_000) return "€€€"
  return "€€€€"
}

// ---------------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------------

export interface RestaurantSchemaOptions {
  baseUrl: string
  /** Logo or hero image, absolute or app-relative. */
  image?: string | null
  /** From `derivePriceRange`, or whatever the owner has configured. */
  priceRange?: string
  /** e.g. ["Pizza", "Italienne"] — the establishment's own words. */
  servesCuisine?: readonly string[]
}

/**
 * The establishment itself: `Restaurant`, a subtype of `FoodEstablishment`.
 *
 * `@id` is stable across pages so the menu, the breadcrumbs and the product
 * pages all point at one entity rather than describing several.
 */
export function buildRestaurantSchema(
  store: StoreLike,
  options: RestaurantSchemaOptions,
): JsonLdDocument {
  const { baseUrl, image, priceRange, servesCuisine } = options
  const address = store.address

  const document = {
    "@context": SCHEMA,
    "@type": "Restaurant",
    "@id": `${baseUrl}/#restaurant`,
    name: store.name,
    url: baseUrl,
    hasMenu: `${baseUrl}/menu`,
    description: text(store.description),
    telephone: text(store.phone),
    email: text(store.email),
    image: image ? url(image, baseUrl) : undefined,
    priceRange,
    servesCuisine: servesCuisine?.length ? [...servesCuisine] : undefined,
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: text(address.street),
          addressLocality: text(address.city),
          postalCode: text(address.postalCode),
          addressCountry: text(address.country),
        }
      : undefined,
    geo:
      address && typeof address.latitude === "number" && typeof address.longitude === "number"
        ? {
            "@type": "GeoCoordinates",
            latitude: address.latitude,
            longitude: address.longitude,
          }
        : undefined,
    openingHoursSpecification: buildOpeningHours(store.hours),
  }

  return pruneUndefined(document) as JsonLdDocument
}

/**
 * `OpeningHoursSpecification`, one entry per distinct opening window.
 *
 * Days that share a window are grouped, which is how the specification is meant
 * to be written and how a rich result reads it back ("Mon-Fri 11:00-14:00").
 * A closed day contributes nothing: schema.org expresses "closed" by absence,
 * and an entry with equal `opens` and `closes` says "open for zero minutes",
 * which is not the same claim.
 */
function buildOpeningHours(
  hours: readonly StoreHoursLike[] | null | undefined,
): JsonLdValue[] | undefined {
  if (!hours || hours.length === 0) return undefined

  const windows = new Map<string, { opens: string; closes: string; days: string[] }>()

  for (const entry of hours) {
    if (entry.isClosed) continue
    if (!TIME_PATTERN.test(entry.open) || !TIME_PATTERN.test(entry.close)) continue
    const dayOfWeek = SCHEMA_DAYS[entry.day]
    if (!dayOfWeek) continue

    const key = `${entry.open}-${entry.close}`
    const existing = windows.get(key)
    if (existing) {
      if (!existing.days.includes(dayOfWeek)) existing.days.push(dayOfWeek)
    } else {
      windows.set(key, { opens: entry.open, closes: entry.close, days: [dayOfWeek] })
    }
  }

  if (windows.size === 0) return undefined

  return [...windows.values()].map((window) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: window.days,
    opens: window.opens,
    closes: window.closes,
  }))
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export interface MenuSchemaOptions {
  baseUrl: string
  currency?: string
}

/**
 * The carte: `Menu` → `MenuSection` → `MenuItem`, priced.
 *
 * Sections with no dish are dropped rather than emitted empty, and dishes with
 * no section of their own are collected under the establishment's name so that
 * nothing in the catalogue is silently left out of the document.
 */
export function buildMenuSchema(
  store: StoreLike,
  sections: readonly MenuSectionLike[],
  items: readonly MenuItemLike[],
  options: MenuSchemaOptions,
): JsonLdDocument {
  const { baseUrl, currency = "EUR" } = options

  const menuItem = (item: MenuItemLike): JsonLdValue =>
    pruneUndefined({
      "@type": "MenuItem",
      name: item.name,
      description: text(item.description),
      image: item.imageUrl ? url(item.imageUrl, baseUrl) : undefined,
      url: `${baseUrl}/product/${item.id}`,
      offers: {
        "@type": "Offer",
        price: priceString(item.price),
        priceCurrency: currency,
        availability:
          item.available === false ? `${SCHEMA}/OutOfStock` : `${SCHEMA}/InStock`,
      },
    }) as JsonLdValue

  const sectioned = sections
    .map((section) => {
      const dishes = items.filter((item) => item.sectionId === section.id)
      if (dishes.length === 0) return undefined
      return pruneUndefined({
        "@type": "MenuSection",
        name: section.name,
        description: text(section.description),
        url: `${baseUrl}/menu?category=${encodeURIComponent(section.slug)}`,
        hasMenuItem: dishes.map(menuItem),
      })
    })
    .filter((section): section is JsonLdValue => section !== undefined)

  const sectionIds = new Set(sections.map((section) => section.id))
  const orphans = items.filter(
    (item) => !item.sectionId || !sectionIds.has(item.sectionId),
  )
  const hasMenuSection =
    orphans.length > 0
      ? [
          ...sectioned,
          {
            "@type": "MenuSection",
            name: store.name,
            hasMenuItem: orphans.map(menuItem),
          } as JsonLdValue,
        ]
      : sectioned

  return pruneUndefined({
    "@context": SCHEMA,
    "@type": "Menu",
    name: `Carte — ${store.name}`,
    url: `${baseUrl}/menu`,
    hasMenuSection: hasMenuSection.length > 0 ? hasMenuSection : undefined,
  }) as JsonLdDocument
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface ProductSchemaOptions {
  baseUrl: string
  currency?: string
  /** The establishment that sells it — links the dish back to the restaurant. */
  store?: StoreLike
}

export function buildProductSchema(
  product: MenuItemLike,
  options: ProductSchemaOptions,
): JsonLdDocument {
  const { baseUrl, currency = "EUR", store } = options

  return pruneUndefined({
    "@context": SCHEMA,
    "@type": "MenuItem",
    name: product.name,
    description: text(product.description),
    image: product.imageUrl ? url(product.imageUrl, baseUrl) : undefined,
    url: `${baseUrl}/product/${product.id}`,
    offers: {
      "@type": "Offer",
      price: priceString(product.price),
      priceCurrency: currency,
      url: `${baseUrl}/product/${product.id}`,
      availability:
        product.available === false ? `${SCHEMA}/OutOfStock` : `${SCHEMA}/InStock`,
      seller: store
        ? { "@type": "Restaurant", "@id": `${baseUrl}/#restaurant`, name: store.name }
        : undefined,
    },
  }) as JsonLdDocument
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function buildBreadcrumbSchema(
  trail: readonly BreadcrumbLike[],
  baseUrl: string,
): JsonLdDocument | undefined {
  if (trail.length === 0) return undefined

  return pruneUndefined({
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: url(crumb.path, baseUrl),
    })),
  }) as JsonLdDocument
}

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

/**
 * JSON, serialised so it cannot end the `<script>` element it sits in.
 *
 * WHY NOT A REGULAR EXPRESSION FOR `</script>`. That is what this did, and it
 * matched the literal string only. An HTML parser ends a script element at
 * `</script` followed by whitespace, `/` or `>` — so `</script >`,
 * `</script/>` and `</script\n>` all walked straight through a
 * `.replace(/<\/script>/gi, …)` and closed the tag. Everything after them was
 * parsed as markup. The fields reaching this function are an establishment's
 * own copy: the article title, the dish name, the address.
 *
 * ESCAPING `<` INSTEAD closes the whole class rather than the spelling that was
 * noticed. No `</script` variant can survive an escaped `<`, and neither can
 * `<!--`, which starts a comment the script parser also honours. `>` and `&`
 * go with it so that `-->` and entity tricks cannot reconstitute either.
 *
 * `\u003c` is a JSON string escape, so `JSON.parse` — and every consumer of
 * `application/ld+json`, Google's included — reads back the original
 * character. The document is not altered; only its spelling on the wire is.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}

/**
 * Renders a JSON-LD script tag for embedding in a page.
 */
export function JsonLd({ data }: { data: JsonLdDocument | undefined }) {
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(pruneUndefined(data)) }}
    />
  )
}
