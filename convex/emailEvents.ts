import { query, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailEvents";

// === Queries (auth-protected) ===

export const listByCampaign = query({
  args: defs.listByCampaign.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.listByCampaign.handler(ctx, args);
  },
});

export const listBySubscriber = query({
  args: defs.listBySubscriber.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.listBySubscriber.handler(ctx, args);
  },
});

// === Internal mutations (called by SES webhook HTTP action only) ===

export const create = internalMutation(defs.create);
export const createBatch = internalMutation(defs.createBatch);
