import { query } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/languages";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

export const list = query(defs.list);
export const listActive = query(defs.listActive);
export const listAll = query(defs.listAll);

const languageStoreId = storeIdFromDocument("Language not found");

export const create = storeMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: languageStoreId,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const toggleActive = storeMutation({
  args: defs.toggleActive.args,
  storeIdFrom: languageStoreId,
  handler: (ctx, args) => defs.toggleActive.handler(ctx, args),
});

export const setDefault = storeMutation({
  args: defs.setDefault.args,
  handler: (ctx, args) => defs.setDefault.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: languageStoreId,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
