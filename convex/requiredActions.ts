import { query } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/requiredActions";
import { storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

export const list = query(defs.list);

export const create = storeMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: storeIdFromDocument("Action not found"),
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: storeIdFromDocument("Action not found"),
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
