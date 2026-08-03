import { internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailAutomations";
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

export const listActive = storeQuery({
  args: defs.listActive.args,
  handler: (ctx, args) => defs.listActive.handler(ctx, args),
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

export const activate = authedMutation({
  args: defs.activate.args,
  handler: (ctx, args) => defs.activate.handler(ctx, args),
});

export const pause = authedMutation({
  args: defs.pause.args,
  handler: (ctx, args) => defs.pause.handler(ctx, args),
});

// === Internal mutations ===

export const incrementStats = internalMutation(defs.incrementStats);
