import * as defs from "@be-in-digital/convex-functions/emailSegments";
import { storeQuery, authedQuery, authedMutation } from "./lib/storeFunctions";

// === Queries (auth-protected) ===

export const list = storeQuery({
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = authedQuery({
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const countMatchingSubscribers = storeQuery({
  args: defs.countMatchingSubscribers.args,
  handler: (ctx, args) => defs.countMatchingSubscribers.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const create = authedMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = authedMutation({
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = authedMutation({
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const duplicate = authedMutation({
  args: defs.duplicate.args,
  handler: (ctx, args) => defs.duplicate.handler(ctx, args),
});

export const refreshCount = authedMutation({
  args: defs.refreshCount.args,
  handler: (ctx, args) => defs.refreshCount.handler(ctx, args),
});
