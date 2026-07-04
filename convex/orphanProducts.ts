import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/orphanProducts";

export const listByStorePlatform = query(defs.listByStorePlatform);
export const listPending = query(defs.listPending);

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.create.handler(ctx, args);
  },
});

export const match = mutation({
  args: defs.match.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.match.handler(ctx, args);
  },
});

export const ignore = mutation({
  args: defs.ignore.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.ignore.handler(ctx, args);
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
