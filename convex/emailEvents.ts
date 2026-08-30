import { internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailEvents";
import { storeQuery, storeIdFromField } from "./lib/storeFunctions";

// === Queries (auth-protected) ===

// Opens, clicks and bounces of a campaign — auth-only meant any account could
// read another restaurant's engagement history.
export const listByCampaign = storeQuery({
  permission: "marketing:read",
  args: defs.listByCampaign.args,
  storeIdFrom: storeIdFromField("campaignId", "Campaign not found"),
  handler: (ctx, args) => defs.listByCampaign.handler(ctx, args),
});

export const listBySubscriber = storeQuery({
  permission: "marketing:read",
  args: defs.listBySubscriber.args,
  storeIdFrom: storeIdFromField("subscriberId", "Subscriber not found"),
  handler: (ctx, args) => defs.listBySubscriber.handler(ctx, args),
});

// === Internal mutations (called by SES webhook HTTP action only) ===

export const alreadySentTo = internalQuery(defs.alreadySentTo);
export const create = internalMutation(defs.create);
export const createBatch = internalMutation(defs.createBatch);
