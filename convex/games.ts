import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/games";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

export const list = query(defs.list);

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireStoreAccess(ctx, args.storeId);
    return defs.create.handler(ctx, args);
  },
});

export const updateWinRatio = mutation({
  args: defs.updateWinRatio.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("Game not found");
    await requireStoreAccess(ctx, game.storeId);
    return defs.updateWinRatio.handler(ctx, args);
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("Game not found");
    await requireStoreAccess(ctx, game.storeId);
    return defs.update.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const game = await ctx.db.get(args.id);
    if (!game) throw new Error("Game not found");
    await requireStoreAccess(ctx, game.storeId);
    return defs.remove.handler(ctx, args);
  },
});
