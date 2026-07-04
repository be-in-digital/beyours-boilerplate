import { query, mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailAutomations";
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

export const listActive = query({
  args: defs.listActive.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.listActive.handler(ctx, args);
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

export const activate = mutation({
  args: defs.activate.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.activate.handler(ctx, args);
  },
});

export const pause = mutation({
  args: defs.pause.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.pause.handler(ctx, args);
  },
});

// === Internal mutations ===

export const incrementStats = internalMutation(defs.incrementStats);
