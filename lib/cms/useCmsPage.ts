"use client"

import { useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import {
  useStorefrontStoreSelection,
  useLanguageStore,
} from "@be-in-digital/restaurant"
import {
  getFieldDefinition,
} from "@be-in-digital/cms"
import type { CmsFieldValue, CmsBlockValues } from "@be-in-digital/cms"
import { resolveCmsStoreId, type IdentifiedStore } from "./cms-store-id"
import type { Id } from "@/convex/_generated/dataModel"

export interface CmsFieldAccessor {
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

export interface CmsBlockAccessor {
  field: (fieldKey: string) => CmsFieldAccessor
  values: CmsBlockValues
}

export interface UseCmsPageResult {
  isLoading: boolean
  block: (blockKey: string) => CmsBlockAccessor
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

interface UseCmsPageOptions {
  mode?: "public" | "preview"
  /**
   * Whose content to read. Defaults to the store the visitor is browsing.
   *
   * The admin layout passes its own selection instead: an owner editing Lyon
   * while a customer tab sits on Paris must see Lyon's branding, and the two
   * zones no longer share a selection.
   *
   * Either way the id is checked against this deployment before it is sent -
   * see `resolveCmsStoreId`. Both selections are persisted in the browser, so
   * both can name an establishment that is not here any more.
   */
  storeId?: string | null
}

const EMPTY_FIELD: CmsFieldAccessor = {
  text: null,
  mediaUrl: null,
  media: null,
  embedUrl: null,
  altText: null,
  raw: undefined,
}

const EMPTY_BLOCK: CmsBlockAccessor = {
  field: () => EMPTY_FIELD,
  values: {},
}

export function useCmsPage(
  pageSlug: string,
  options?: UseCmsPageOptions,
): UseCmsPageResult {
  const searchParams = useSearchParams()
  const isPreviewParam = searchParams.get("preview") === "true"
  const mode = options?.mode ?? (isPreviewParam ? "preview" : "public")
  const storefrontStoreId = useStorefrontStoreSelection((s) => s.storeId)
  // Every establishment of this deployment, so a persisted id can be vouched
  // for before it reaches a query that would refuse it and take the page down
  // with it. Convex de-duplicates this subscription with the one `useStoreId`
  // already holds in the storefront shell, so it costs one query, not two.
  const stores = useQuery(api.stores.list) as IdentifiedStore[] | undefined
  const storeId = (resolveCmsStoreId({
    requestedStoreId: options?.storeId,
    persistedStoreId: storefrontStoreId,
    stores,
  }) ?? undefined) as Id<"stores"> | undefined
  const locale = useLanguageStore((s) => s.locale)

  // Choose query based on mode
  const publicData = useQuery(
    api.cms.getPageBlocks,
    mode === "public" && storeId ? { storeId, pageSlug } : "skip",
  )

  const previewData = useQuery(
    api.cms.getPreviewPageBlocks,
    mode === "preview" && storeId ? { storeId, pageSlug } : "skip",
  )

  const data = mode === "public" ? publicData : previewData
  const isLoading = data === undefined && !!storeId

  function block(blockKey: string): CmsBlockAccessor {
    if (!data) return EMPTY_BLOCK

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blockData = data.blocks.find((b: any) => b.blockKey === blockKey)
    if (!blockData) return EMPTY_BLOCK

    return {
      values: blockData.values,
      field: (fieldKey: string): CmsFieldAccessor => {
        const value = blockData.values[fieldKey] as CmsFieldValue | undefined
        const _fieldDef = getFieldDefinition(pageSlug, blockKey, fieldKey)

        // If cleared, return null (fallback to code default)
        if (value?.isCleared) return EMPTY_FIELD

        // If no value exists, return null (fallback to code default)
        if (!value) return EMPTY_FIELD

        // Resolve translation if available
        let textValue = value.textValue ?? null
        if (
          textValue &&
          locale &&
          blockData.translationsByField?.[fieldKey]?.[locale]
        ) {
          textValue =
            blockData.translationsByField[fieldKey][locale].value ?? textValue
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
    isLoading,
    block,
    pageMeta: data?.pageMeta ?? null,
  }
}
