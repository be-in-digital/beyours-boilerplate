import { internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailCampaigns";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const emailCampaignsStoreId = storeIdFromDocument("Campaign not found");

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "marketing:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = storeQuery({
  permission: "marketing:read",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const listRecent = storeQuery({
  permission: "marketing:read",
  args: defs.listRecent.args,
  handler: (ctx, args) => defs.listRecent.handler(ctx, args),
});

export const listByStatus = storeQuery({
  permission: "marketing:read",
  args: defs.listByStatus.args,
  handler: (ctx, args) => defs.listByStatus.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const schedule = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.schedule.args,
  handler: (ctx, args) => defs.schedule.handler(ctx, args),
});

export const cancel = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.cancel.args,
  handler: (ctx, args) => defs.cancel.handler(ctx, args),
});

export const pause = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailCampaignsStoreId,
  args: defs.pause.args,
  handler: (ctx, args) => defs.pause.handler(ctx, args),
});

// === Internal mutations (called by SES webhook / scheduler) ===

export const markSending = internalMutation(defs.markSending);
export const markSent = internalMutation(defs.markSent);
export const resetStats = internalMutation(defs.resetStats);
export const incrementStats = internalMutation(defs.incrementStats);
export const incrementRevenue = internalMutation(defs.incrementRevenue);
