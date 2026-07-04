import { query, mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailCampaigns";
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

export const listRecent = query({
  args: defs.listRecent.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.listRecent.handler(ctx, args);
  },
});

export const listByStatus = query({
  args: defs.listByStatus.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId);
    return defs.listByStatus.handler(ctx, args);
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

export const schedule = mutation({
  args: defs.schedule.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.schedule.handler(ctx, args);
  },
});

export const cancel = mutation({
  args: defs.cancel.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.cancel.handler(ctx, args);
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

// === Internal mutations (called by SES webhook / scheduler) ===

export const markSending = internalMutation(defs.markSending);
export const markSent = internalMutation(defs.markSent);
export const resetStats = internalMutation(defs.resetStats);
export const incrementStats = internalMutation(defs.incrementStats);
export const incrementRevenue = internalMutation(defs.incrementRevenue);
