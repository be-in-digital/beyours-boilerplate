/**
 * Blog Auto Generate — Internal Functions
 *
 * internalQuery + internalMutation for the AI article generation flow.
 * NO "use node" — these run in the default Convex runtime.
 * Called by the action in blogAutoGenerate.ts ("use node").
 */

import { v } from "convex/values"
import { internalQuery, internalMutation } from "./_generated/server"
import { checkAutoBlogAccess } from "@be-in-digital/convex-functions/blogAutoGuards"
import {
  getGenerationContextCore,
  saveGeneratedArticleCore,
} from "@be-in-digital/convex-functions/blogAutoGenerate"
import { scheduleBlogTranslation } from "./blogAutoTranslate"

// ============================================================================
// Internal Queries
// ============================================================================

/** Check entitlements + quota for the authenticated owner */
export const _checkAccess = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return checkAutoBlogAccess(ctx, ownerId)
  },
})

/** Get store and category context for the AI prompt */
export const _getGenerationContext = internalQuery({
  args: {
    storeId: v.id("stores"),
    categoryId: v.id("blogCategories"),
  },
  handler: async (ctx, args) => {
    return getGenerationContextCore(ctx, {
      storeId: args.storeId,
      categoryId: args.categoryId,
    })
  },
})

// ============================================================================
// Internal Mutations
// ============================================================================

/** Create a cmsMedia record for a blog-auto image (called from generateArticle action) */
export const _createBlogImage = internalMutation({
  args: {
    storeId: v.id("stores"),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const mediaId = await ctx.db.insert("cmsMedia", {
      storeId: args.storeId,
      kind: "image" as const,
      filename: args.filename,
      mimeType: args.mimeType,
      size: args.size,
      folder: "blog-auto",
      uploadedBy: args.uploadedBy,
      status: "processing" as const,
      usageCount: 0,
      uploadedAt: now,
    })
    return mediaId
  },
})

/** Save the generated article as a draft + increment usage + optional auto-translate */
export const _saveGeneratedArticle = internalMutation({
  args: {
    storeId: v.id("stores"),
    ownerId: v.string(),
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    categoryId: v.id("blogCategories"),
    authorId: v.string(),
    coverImageId: v.optional(v.id("cmsMedia")),
    coverImageAlt: v.optional(v.string()),
    metaTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    autoTranslate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const articleId = await saveGeneratedArticleCore(ctx, {
      storeId: args.storeId,
      ownerId: args.ownerId,
      title: args.title,
      excerpt: args.excerpt,
      content: args.content,
      categoryId: args.categoryId,
      authorId: args.authorId,
      coverImageId: args.coverImageId,
      coverImageAlt: args.coverImageAlt,
      metaTitle: args.metaTitle,
      metaDescription: args.metaDescription,
      tags: args.tags,
    })

    // Schedule auto-translation if enabled
    if (args.autoTranslate) {
      await scheduleBlogTranslation(ctx, articleId, args.storeId)
    }

    return articleId
  },
})
