import { query } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/languages";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

// @public-by-design: the language switcher runs before any sign-in. A list of
// enabled locales is not confidential.
// @public-by-design: the language switcher runs before any sign-in
export const list = query(defs.list);
// @public-by-design: the language switcher runs before any sign-in
export const listActive = query(defs.listActive);
// @public-by-design: the language switcher runs before any sign-in
export const listAll = query(defs.listAll);

const languageStoreId = storeIdFromDocument("Language not found");

export const create = storeMutation({
  permission: "translations:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const toggleActive = storeMutation({
  permission: "translations:write",
  args: defs.toggleActive.args,
  storeIdFrom: languageStoreId,
  handler: (ctx, args) => defs.toggleActive.handler(ctx, args),
});

export const setDefault = storeMutation({
  permission: "translations:write",
  args: defs.setDefault.args,
  handler: (ctx, args) => defs.setDefault.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "translations:write",
  args: defs.remove.args,
  storeIdFrom: languageStoreId,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
