import { query, mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailSubscribers";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

// === Queries (auth-protected) ===

export const list = query({
  args: defs.list.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.list.handler(ctx, args);
  },
});

export const getById = query({
  args: defs.getById.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.getById.handler(ctx, args);
  },
});

export const getByEmail = query({
  args: defs.getByEmail.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.getByEmail.handler(ctx, args);
  },
});

export const countByStatus = query({
  args: defs.countByStatus.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.countByStatus.handler(ctx, args);
  },
});

// === Mutations (auth-protected) ===

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.create.handler(ctx, args);
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.update.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.remove.handler(ctx, args);
  },
});

export const addTag = mutation({
  args: defs.addTag.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.addTag.handler(ctx, args);
  },
});

export const removeTag = mutation({
  args: defs.removeTag.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.removeTag.handler(ctx, args);
  },
});

export const importBatch = mutation({
  args: defs.importBatch.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.importBatch.handler(ctx, args);
  },
});

/**
 * Public mutation — allows storefront visitors to subscribe to the newsletter.
 * Only accepts source "storefront_form" to prevent abuse.
 */
export const subscribe = mutation({
  args: {
    storeId: defs.create.args.storeId,
    email: defs.create.args.email,
  },
  handler: async (ctx, args) => {
    return defs.create.handler(ctx, {
      ...args,
      source: "storefront_form",
      tags: ["newsletter"],
    });
  },
});

// === Internal mutations (called by schedulers / HTTP actions) ===

export const confirmDoubleOptIn = internalMutation(defs.confirmDoubleOptIn);
export const unsubscribe = internalMutation(defs.unsubscribe);
export const markBounced = internalMutation(defs.markBounced);
export const markComplained = internalMutation(defs.markComplained);
export const updateMetadataIncremental = internalMutation(defs.updateMetadataIncremental);
