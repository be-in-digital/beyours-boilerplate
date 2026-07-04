import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/externalProductMappings";

export const listByStorePlatform = query(defs.listByStorePlatform);
export const getByInternal = query(defs.getByInternal);
export const getByExternal = query(defs.getByExternal);

export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.upsert.handler(ctx, args);
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

export const removeAllByStorePlatform = mutation({
  args: defs.removeAllByStorePlatform.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.removeAllByStorePlatform.handler(ctx, args);
  },
});
