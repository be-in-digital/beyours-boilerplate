import { query, mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/promotions";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

// === Queries (public for storefront) ===

export const list = query(defs.list);
export const getById = query(defs.getById);
export const getByCouponCode = query(defs.getByCouponCode);
export const listActiveAuto = query(defs.listActiveAuto);
export const getCustomerUsageCount = query(defs.getCustomerUsageCount);

// === Mutations (protected) ===

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
    const promotion = await ctx.db.get(args.id);
    if (!promotion) throw new Error("Promotion not found");
    await requireStoreAccess(ctx, promotion.storeId);
    return defs.update.handler(ctx, args);
  },
});

export const toggleStatus = mutation({
  args: defs.toggleStatus.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const promotion = await ctx.db.get(args.id);
    if (!promotion) throw new Error("Promotion not found");
    await requireStoreAccess(ctx, promotion.storeId);
    return defs.toggleStatus.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const promotion = await ctx.db.get(args.id);
    if (!promotion) throw new Error("Promotion not found");
    await requireStoreAccess(ctx, promotion.storeId);
    return defs.remove.handler(ctx, args);
  },
});

// === Internal Mutations (for checkout flow) ===

export const incrementUsage = internalMutation(defs.incrementUsage);
