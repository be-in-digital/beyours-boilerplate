import { query } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/translations";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// PUBLIC BY DESIGN — these read translations of already-public content (product
// names, category labels, storefront UI strings). The storefront renders them
// for anonymous visitors, so requiring auth here would break the language
// switcher. Nothing store-confidential passes through them.
// @public-by-design: translations of already-public content (product names, UI strings)
export const getForEntity = query(defs.getForEntity);
// @public-by-design: translations of already-public content (product names, UI strings)
export const getByLanguage = query(defs.getByLanguage);
// @public-by-design: translations of already-public content (product names, UI strings)
export const getUIOverrides = query(defs.getUIOverrides);

// Writes are a different matter: these used to check only that the caller was
// logged in, so any account could rewrite another restaurant's translations.
export const upsert = storeMutation({
  permission: "translations:write",
  args: defs.upsert.args,
  handler: (ctx, args) => defs.upsert.handler(ctx, args),
});

export const bulkUpsert = storeMutation({
  permission: "translations:write",
  args: defs.bulkUpsert.args,
  handler: (ctx, args) => defs.bulkUpsert.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "translations:write",
  args: defs.remove.args,
  storeIdFrom: storeIdFromDocument("Translation not found"),
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
