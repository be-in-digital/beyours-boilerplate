/**
 * Blog App Wrappers
 *
 * Auth-protected wrappers around package-level blog functions.
 * Public queries (storefront) have no auth.
 * Admin queries and all mutations require authentication.
 */

import { v } from "convex/values"
import { query, internalMutation } from "./_generated/server"
import type { QueryCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
import * as blogDefs from "@be-in-digital/convex-functions/blog"
import {
  createArticleCore,
  saveDraftCore,
  deleteArticleCore,
} from "@be-in-digital/convex-functions/blog"
import {
  publishArticleCore,
  scheduleArticleCore,
  unscheduleArticleCore,
  archiveArticleCore,
  unarchiveArticleCore,
} from "@be-in-digital/convex-functions/blogPublish"
import { scheduleBlogTranslation } from "./blogAutoTranslate"
import { storeMutation, authedQuery } from "./lib/storeFunctions"

// ============================================================================
// Public Queries (storefront, no auth)
// ============================================================================

export const listPublishedArticles = query(blogDefs.listPublishedArticles)
export const listByCategory = query(blogDefs.listByCategory)
export const listByTag = query(blogDefs.listByTag)
export const getArticleBySlug = query(blogDefs.getArticleBySlug)
export const listCategories = query(blogDefs.listCategories)
export const listTags = query(blogDefs.listTags)

// ============================================================================
// Admin Queries (auth-protected)
// ============================================================================

export const listAdminArticles = authedQuery({
  args: blogDefs.listAdminArticles.args,
  handler: (ctx, args) => blogDefs.listAdminArticles.handler(ctx, args),
})

export const getAdminArticle = authedQuery({
  args: blogDefs.getAdminArticle.args,
  handler: (ctx, args) => blogDefs.getAdminArticle.handler(ctx, args),
})

// ============================================================================
// Store id resolvers (documents referenced through non-`id` args)
// ============================================================================

async function storeIdFromArticle(
  ctx: QueryCtx,
  args: { articleId: Id<"blogArticles"> }
): Promise<Id<"stores">> {
  const article = await ctx.db.get(args.articleId)
  if (!article) throw new Error("Article not found")
  return article.storeId
}

async function storeIdFromCategory(
  ctx: QueryCtx,
  args: { categoryId: Id<"blogCategories"> }
): Promise<Id<"stores">> {
  const category = await ctx.db.get(args.categoryId)
  if (!category) throw new Error("Category not found")
  return category.storeId
}

async function storeIdFromTag(
  ctx: QueryCtx,
  args: { tagId: Id<"blogTags"> }
): Promise<Id<"stores">> {
  const tag = await ctx.db.get(args.tagId)
  if (!tag) throw new Error("Tag not found")
  return tag.storeId
}

// ============================================================================
// Admin Mutations — Articles
// ============================================================================

/** Create a new blog article (draft) */
export const createArticle = storeMutation({
  args: {
    storeId: v.id("stores"),
    title: v.string(),
    categoryId: v.id("blogCategories"),
  },
  handler: (ctx, args, identity) =>
    createArticleCore(ctx, {
      storeId: args.storeId,
      title: args.title,
      categoryId: args.categoryId,
      authorId: identity.subject,
    }),
})

/** Save draft content for an article */
export const saveDraft = storeMutation({
  args: {
    articleId: v.id("blogArticles"),
    draftContent: v.any(),
    categoryId: v.id("blogCategories"),
    tagIds: v.optional(v.array(v.id("blogTags"))),
  },
  storeIdFrom: storeIdFromArticle,
  handler: async (ctx, args, identity) => {
    await saveDraftCore(
      ctx,
      {
        articleId: args.articleId,
        draftContent: args.draftContent,
        categoryId: args.categoryId,
        authorId: identity.subject,
        updatedBy: identity.subject,
      },
      {
        onAfterSave: scheduleBlogTranslation,
      },
    )

    // Sync tags if provided
    if (args.tagIds) {
      await blogDefs.updateArticleTags.handler(ctx, {
        articleId: args.articleId,
        tagIds: args.tagIds,
      })
    }
  },
})

/** Publish an article */
export const publishArticle = storeMutation({
  args: { articleId: v.id("blogArticles") },
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args, identity) =>
    publishArticleCore(ctx, args.articleId, identity.subject),
})

/** Schedule an article for future publication */
export const scheduleArticle = storeMutation({
  args: {
    articleId: v.id("blogArticles"),
    publishAt: v.number(),
  },
  storeIdFrom: storeIdFromArticle,
  handler: async (ctx, args): Promise<void> => {
    // Schedule the internal publish action
    const jobId = await ctx.scheduler.runAt(
      args.publishAt,
      internal.blog._publishArticleInternal,
      { articleId: args.articleId },
    )

    return scheduleArticleCore(ctx, args.articleId, args.publishAt, jobId)
  },
})

/** Unschedule an article (revert to draft) */
export const unscheduleArticle = storeMutation({
  args: { articleId: v.id("blogArticles") },
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args) => unscheduleArticleCore(ctx, args.articleId),
})

/** Archive an article */
export const archiveArticle = storeMutation({
  args: { articleId: v.id("blogArticles") },
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args) => archiveArticleCore(ctx, args.articleId),
})

/** Unarchive an article */
export const unarchiveArticle = storeMutation({
  args: { articleId: v.id("blogArticles") },
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args) => unarchiveArticleCore(ctx, args.articleId),
})

/** Delete an article */
export const deleteArticle = storeMutation({
  args: { articleId: v.id("blogArticles") },
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args) => deleteArticleCore(ctx, args),
})

// ============================================================================
// Admin Mutations — Categories
// ============================================================================

export const createCategory = storeMutation({
  args: blogDefs.createCategory.args,
  handler: (ctx, args) => blogDefs.createCategory.handler(ctx, args),
})

export const updateCategory = storeMutation({
  args: blogDefs.updateCategory.args,
  storeIdFrom: storeIdFromCategory,
  handler: (ctx, args) => blogDefs.updateCategory.handler(ctx, args),
})

export const deleteCategory = storeMutation({
  args: blogDefs.deleteCategory.args,
  storeIdFrom: storeIdFromCategory,
  handler: (ctx, args) => blogDefs.deleteCategory.handler(ctx, args),
})

// ============================================================================
// Admin Mutations — Tags
// ============================================================================

export const createTag = storeMutation({
  args: blogDefs.createTag.args,
  handler: (ctx, args) => blogDefs.createTag.handler(ctx, args),
})

export const deleteTag = storeMutation({
  args: blogDefs.deleteTag.args,
  storeIdFrom: storeIdFromTag,
  handler: (ctx, args) => blogDefs.deleteTag.handler(ctx, args),
})

export const updateArticleTags = storeMutation({
  args: blogDefs.updateArticleTags.args,
  storeIdFrom: storeIdFromArticle,
  handler: (ctx, args) => blogDefs.updateArticleTags.handler(ctx, args),
})

// ============================================================================
// Internal Mutations (for scheduled publish)
// ============================================================================

/** Called by scheduler to publish a scheduled article */
export const _publishArticleInternal = internalMutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    return publishArticleCore(ctx, args.articleId, "system")
  },
})
