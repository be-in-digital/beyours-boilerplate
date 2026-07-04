"use client"

import { useQuery } from "convex/react"
import { useSearchParams } from "next/navigation"
import { api } from "@/convex/_generated/api"
import { useStoreStore, useLanguageStore } from "@be-in-digital/restaurant"
import {
  getFieldDefinition,
} from "@be-in-digital/cms"
import type { CmsFieldValue, CmsBlockValues } from "@be-in-digital/cms"
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
  pageMeta: {
    hasPublished: boolean
    hasUnpublishedChanges: boolean
    publishedAt?: number
  } | null
}

interface UseCmsPageOptions {
  mode?: "public" | "preview"
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
  const storeId = useStoreStore(
    (s) => s.currentStore?._id,
  ) as Id<"stores"> | undefined
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
