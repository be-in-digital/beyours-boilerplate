import { query, mutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/categories";
import { requireStorePermission } from "@be-in-digital/convex-functions/auth";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// === Queries (public for storefront) ===

// @public-by-design: the storefront renders the category menu to anonymous
// visitors. Categories carry no store-confidential data.
// @public-by-design: storefront category menu, rendered for anonymous visitors
export const list = query(defs.list);
// @public-by-design: storefront category menu, rendered for anonymous visitors
export const getById = query(defs.getById);
// @public-by-design: storefront category menu, rendered for anonymous visitors
export const listActiveWithCounts = query(defs.listActiveWithCounts);

// === Mutations (with authorization) ===

const categoryStoreId = storeIdFromDocument("Category not found");

export const create = storeMutation({
  args: defs.create.args,
  permission: "products:write",
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: categoryStoreId,
  permission: "products:write",
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

// @guarded-inline: authorises inside the handler
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

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: categoryStoreId,
  permission: "products:delete",
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
