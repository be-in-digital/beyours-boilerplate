/**
 * Server-side CMS Page Helper
 *
 * Equivalent of useCmsPage() but for Server Components.
 * Uses ConvexHttpClient instead of React hooks.
 */

import "server-only"
import { cookies } from "next/headers"
import { LOCALE_COOKIE_NAME, normalizeStoredLocale } from "@be-in-digital/core"
import { fetchCmsPageData } from "@/lib/convex-server"
import type { CmsFieldValue, CmsBlockValues } from "@be-in-digital/cms"
import type { Id } from "@/convex/_generated/dataModel"

// ---------------------------------------------------------------------------
// Types (same interface as useCmsPage for consistency)
// ---------------------------------------------------------------------------

export interface ServerCmsFieldAccessor {
  text: string | null
  mediaUrl: string | null
  media: {
    url: string
    thumbnailUrl?: string
    filename: string
    mimeType: string
    width?: number
    height?: number
  } | null
  embedUrl: string | null
  altText: string | null
  raw: CmsFieldValue | undefined
}

export interface ServerCmsBlockAccessor {
  field: (fieldKey: string) => ServerCmsFieldAccessor
  values: CmsBlockValues
}

export interface ServerCmsPageResult {
  block: (blockKey: string) => ServerCmsBlockAccessor
  /**
   * What the public query says about the page, which is deliberately little.
   *
   * `hasUnpublishedChanges`, `draftUpdatedAt` and `updatedBy` left in #97: they
   * are editorial state and a staff user id, and this query is anonymous. The
   * admin editor reads them from `getAdminPageBlocks`, which is guarded. Nothing
   * on the storefront ever read one.
   */
  pageMeta: {
    hasPublished: boolean
    publishedAt?: number
  } | null
}

// ---------------------------------------------------------------------------
// Empty defaults
// ---------------------------------------------------------------------------

const EMPTY_FIELD: ServerCmsFieldAccessor = {
  text: null,
  mediaUrl: null,
  media: null,
  embedUrl: null,
  altText: null,
  raw: undefined,
}

const EMPTY_BLOCK: ServerCmsBlockAccessor = {
  field: () => EMPTY_FIELD,
  values: {},
}

const EMPTY_PAGE: ServerCmsPageResult = {
  block: () => EMPTY_BLOCK,
  pageMeta: null,
}

// ---------------------------------------------------------------------------
// Main helper
// ---------------------------------------------------------------------------

/**
 * Fetch CMS page data server-side.
 *
 * Rule: if locale is provided → use it directly (don't read cookies).
 *       if locale is absent → fall back to the locale cookie.
 *
 * The cookie is `beid_locale`, which is what `setLocale` writes and what
 * `app/layout.tsx` reads. This function read a cookie called `locale`, which
 * nothing has ever written, so `resolvedLocale` was always null and every
 * server-rendered CMS string came back in the source language.
 */
export async function fetchCmsPage(
  storeId: Id<"stores">,
  pageSlug: string,
  locale?: string,
): Promise<ServerCmsPageResult> {
  // Resolve locale: explicit param > cookie > null
  const resolvedLocale =
    locale ??
    normalizeStoredLocale((await cookies()).get(LOCALE_COOKIE_NAME)?.value)

  const data = await fetchCmsPageData(storeId, pageSlug)
  if (!data) return EMPTY_PAGE

  function block(blockKey: string): ServerCmsBlockAccessor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blockData = data.blocks.find((b: any) => b.blockKey === blockKey)
    if (!blockData) return EMPTY_BLOCK

    return {
      values: blockData.values,
      field: (fieldKey: string): ServerCmsFieldAccessor => {
        const value = blockData.values[fieldKey] as CmsFieldValue | undefined

        // If cleared or absent, return null (fallback to code default)
        if (value?.isCleared || !value) return EMPTY_FIELD

        // Resolve translation if available
        let textValue = value.textValue ?? null
        if (
          textValue &&
          resolvedLocale &&
          blockData.translationsByField?.[fieldKey]?.[resolvedLocale]
        ) {
          textValue =
            blockData.translationsByField[fieldKey][resolvedLocale].value ??
            textValue
        }

        // Resolve media
        const mediaInfo = blockData.resolvedMedia?.[fieldKey] ?? null

        return {
          text: textValue,
          mediaUrl: mediaInfo?.url ?? null,
          media: mediaInfo,
          embedUrl: value.embedUrl ?? null,
          altText: value.altText ?? null,
          raw: value,
        }
      },
    }
  }

  return {
    block,
    pageMeta: data.pageMeta ?? null,
  }
}
