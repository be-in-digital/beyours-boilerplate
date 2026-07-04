import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/translations";

export const getForEntity = query(defs.getForEntity);
export const getByLanguage = query(defs.getByLanguage);
export const getUIOverrides = query(defs.getUIOverrides);

export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.upsert.handler(ctx, args);
  },
});

export const bulkUpsert = mutation({
  args: defs.bulkUpsert.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.bulkUpsert.handler(ctx, args);
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
