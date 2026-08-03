import { internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailCampaigns";
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

export const listRecent = storeQuery({
  args: defs.listRecent.args,
  handler: (ctx, args) => defs.listRecent.handler(ctx, args),
});

export const listByStatus = storeQuery({
  args: defs.listByStatus.args,
  handler: (ctx, args) => defs.listByStatus.handler(ctx, args),
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

export const schedule = authedMutation({
  args: defs.schedule.args,
  handler: (ctx, args) => defs.schedule.handler(ctx, args),
});

export const cancel = authedMutation({
  args: defs.cancel.args,
  handler: (ctx, args) => defs.cancel.handler(ctx, args),
});

export const pause = authedMutation({
  args: defs.pause.args,
  handler: (ctx, args) => defs.pause.handler(ctx, args),
});

// === Internal mutations (called by SES webhook / scheduler) ===

export const markSending = internalMutation(defs.markSending);
export const markSent = internalMutation(defs.markSent);
export const resetStats = internalMutation(defs.resetStats);
export const incrementStats = internalMutation(defs.incrementStats);
export const incrementRevenue = internalMutation(defs.incrementRevenue);
