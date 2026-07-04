import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/categories";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";

// === Queries (public for storefront) ===

export const list = query(defs.list);
export const getById = query(defs.getById);
export const listActiveWithCounts = query(defs.listActiveWithCounts);

// === Mutations (with authorization) ===

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    await requireStorePermission(ctx, args.storeId, "products:write");
    return defs.create.handler(ctx, args);
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = await (ctx.db as any).get(args.id);
    if (!category) throw new Error("Category not found");
    await requireStorePermission(ctx, category.storeId, "products:write");
    return defs.update.handler(ctx, args);
  },
});

export const reorder = mutation({
  args: defs.reorder.args,
  handler: async (ctx, args) => {
    // Verify all categories belong to the same store
    let storeId: string | null = null;
    for (const id of args.ids) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cat = await (ctx.db as any).get(id);
      if (!cat) throw new Error(`Category not found: ${id}`);
      if (storeId === null) {
        storeId = cat.storeId;
      } else if (cat.storeId !== storeId) {
        throw new Error("All categories must belong to the same store");
      }
    }
    if (storeId) {
      await requireStorePermission(ctx, storeId, "products:write");
    }
    return defs.reorder.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const category = await (ctx.db as any).get(args.id);
    if (!category) throw new Error("Category not found");
    await requireStorePermission(ctx, category.storeId, "products:delete");
    return defs.remove.handler(ctx, args);
  },
});
