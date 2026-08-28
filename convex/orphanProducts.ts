import * as defs from "@be-in-digital/convex-functions/orphanProducts";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// Integration bookkeeping — products a partner platform sent that match nothing
// in the catalogue. Never storefront data, and it was fully public.
export const listByStorePlatform = storeQuery({
  permission: "products:read",
  args: defs.listByStorePlatform.args,
  handler: (ctx, args) => defs.listByStorePlatform.handler(ctx, args),
});

export const listPending = storeQuery({
  permission: "products:read",
  args: defs.listPending.args,
  handler: (ctx, args) => defs.listPending.handler(ctx, args),
});

const orphanStoreId = storeIdFromDocument("Orphan product not found");

export const create = storeMutation({
  permission: "products:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const match = storeMutation({
  permission: "products:write",
  args: defs.match.args,
  storeIdFrom: orphanStoreId,
  handler: (ctx, args) => defs.match.handler(ctx, args),
});

export const ignore = storeMutation({
  permission: "products:write",
  args: defs.ignore.args,
  storeIdFrom: orphanStoreId,
  handler: (ctx, args) => defs.ignore.handler(ctx, args),
});
