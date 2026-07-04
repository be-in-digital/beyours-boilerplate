import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/languages";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

export const list = query(defs.list);
export const listActive = query(defs.listActive);
export const listAll = query(defs.listAll);

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireStoreAccess(ctx, args.storeId);
    return defs.create.handler(ctx, args);
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const language = await ctx.db.get(args.id);
    if (!language) throw new Error("Language not found");
    await requireStoreAccess(ctx, language.storeId);
    return defs.update.handler(ctx, args);
  },
});

export const toggleActive = mutation({
  args: defs.toggleActive.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const language = await ctx.db.get(args.id);
    if (!language) throw new Error("Language not found");
    await requireStoreAccess(ctx, language.storeId);
    return defs.toggleActive.handler(ctx, args);
  },
});

export const setDefault = mutation({
  args: defs.setDefault.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireStoreAccess(ctx, args.storeId);
    return defs.setDefault.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const language = await ctx.db.get(args.id);
    if (!language) throw new Error("Language not found");
    await requireStoreAccess(ctx, language.storeId);
    return defs.remove.handler(ctx, args);
  },
});
