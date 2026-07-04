/**
 * Blog App Wrappers
 *
 * Auth-protected wrappers around package-level blog functions.
 * Public queries (storefront) have no auth.
 * Admin queries and all mutations require authentication.
 */

import { v } from "convex/values"
import { query, mutation, internalMutation } from "./_generated/server"
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
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth"

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

export const listAdminArticles = query({
  args: blogDefs.listAdminArticles.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return blogDefs.listAdminArticles.handler(ctx, args)
  },
})

export const getAdminArticle = query({
  args: blogDefs.getAdminArticle.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    return blogDefs.getAdminArticle.handler(ctx, args)
  },
})

// ============================================================================
// Admin Mutations — Articles
// ============================================================================

/** Create a new blog article (draft) */
export const createArticle = mutation({
  args: {
    storeId: v.id("stores"),
    title: v.string(),
    categoryId: v.id("blogCategories"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    await requireStoreAccess(ctx, args.storeId)
    return createArticleCore(ctx, {
      storeId: args.storeId,
      title: args.title,
      categoryId: args.categoryId,
      authorId: identity.subject,
    })
  },
})

/** Save draft content for an article */
export const saveDraft = mutation({
  args: {
    articleId: v.id("blogArticles"),
    draftContent: v.any(),
    categoryId: v.id("blogCategories"),
    tagIds: v.optional(v.array(v.id("blogTags"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)

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
export const publishArticle = mutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return publishArticleCore(ctx, args.articleId, identity.subject)
  },
})

/** Schedule an article for future publication */
export const scheduleArticle = mutation({
  args: {
    articleId: v.id("blogArticles"),
    publishAt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)

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
export const unscheduleArticle = mutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return unscheduleArticleCore(ctx, args.articleId)
  },
})

/** Archive an article */
export const archiveArticle = mutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return archiveArticleCore(ctx, args.articleId)
  },
})

/** Unarchive an article */
export const unarchiveArticle = mutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return unarchiveArticleCore(ctx, args.articleId)
  },
})

/** Delete an article */
export const deleteArticle = mutation({
  args: { articleId: v.id("blogArticles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return deleteArticleCore(ctx, args)
  },
})

// ============================================================================
// Admin Mutations — Categories
// ============================================================================

export const createCategory = mutation({
  args: blogDefs.createCategory.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    await requireStoreAccess(ctx, args.storeId)
    return blogDefs.createCategory.handler(ctx, args)
  },
})

export const updateCategory = mutation({
  args: blogDefs.updateCategory.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const category = await ctx.db.get(args.categoryId)
    if (!category) throw new Error("Category not found")
    await requireStoreAccess(ctx, category.storeId)
    return blogDefs.updateCategory.handler(ctx, args)
  },
})

export const deleteCategory = mutation({
  args: blogDefs.deleteCategory.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const category = await ctx.db.get(args.categoryId)
    if (!category) throw new Error("Category not found")
    await requireStoreAccess(ctx, category.storeId)
    return blogDefs.deleteCategory.handler(ctx, args)
  },
})

// ============================================================================
// Admin Mutations — Tags
// ============================================================================

export const createTag = mutation({
  args: blogDefs.createTag.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    await requireStoreAccess(ctx, args.storeId)
    return blogDefs.createTag.handler(ctx, args)
  },
})

export const deleteTag = mutation({
  args: blogDefs.deleteTag.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const tag = await ctx.db.get(args.tagId)
    if (!tag) throw new Error("Tag not found")
    await requireStoreAccess(ctx, tag.storeId)
    return blogDefs.deleteTag.handler(ctx, args)
  },
})

export const updateArticleTags = mutation({
  args: blogDefs.updateArticleTags.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    const article = await ctx.db.get(args.articleId)
    if (!article) throw new Error("Article not found")
    await requireStoreAccess(ctx, article.storeId)
    return blogDefs.updateArticleTags.handler(ctx, args)
  },
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
