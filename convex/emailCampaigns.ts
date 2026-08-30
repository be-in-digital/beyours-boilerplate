import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
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
export const saveSendCursor = internalMutation(defs.saveSendCursor);
export const dueForSending = internalQuery(defs.dueForSending);

/**
 * Start every campaign whose scheduled time has arrived.
 *
 * Called once a minute from `crons.ts`. It cannot go through the public `send`
 * action: a cron carries no identity, and that action checks
 * `marketing:write` on the caller. The authorisation happened when the owner
 * scheduled the campaign; this is the deferred half of that decision, which is
 * why it lives behind `internalAction`.
 */
export const dispatchScheduled = internalAction({
  args: {},
  handler: async (ctx): Promise<{ started: number }> => {
    const due: string[] = await ctx.runQuery(internal.emailCampaigns.dueForSending, {
      now: Date.now(),
    });

    for (const campaignId of due) {
      // Marked before scheduling, so a second cron tick a minute later no
      // longer sees it as `scheduled` and cannot start it twice.
      await ctx.runMutation(internal.emailCampaigns.markSending, {
        id: campaignId as never,
      });
      await ctx.runMutation(internal.emailCampaigns.saveSendCursor, {
        id: campaignId as never,
        cursor: null,
      });
      await ctx.scheduler.runAfter(0, internal.emailCampaignActions.sendBatch, {
        campaignId: campaignId as never,
      });
    }

    if (due.length > 0) {
      console.log(`[emailCampaigns] dispatched ${due.length} scheduled campaign(s)`);
    }
    return { started: due.length };
  },
});
export const markSent = internalMutation(defs.markSent);
export const resetStats = internalMutation(defs.resetStats);
export const incrementStats = internalMutation(defs.incrementStats);
export const incrementRevenue = internalMutation(defs.incrementRevenue);
