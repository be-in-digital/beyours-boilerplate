import { internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/payments";
import { storeQuery, authedQuery, authedMutation } from "./lib/storeFunctions";

export const getByOrder = authedQuery({
  args: defs.getByOrder.args,
  handler: (ctx, args) => defs.getByOrder.handler(ctx, args),
});

export const getByStore = storeQuery({
  args: defs.getByStore.args,
  handler: (ctx, args) => defs.getByStore.handler(ctx, args),
});

export const create = authedMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const updateStatus = authedMutation({
  args: defs.updateStatus.args,
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
});

export const refund = authedMutation({
  args: defs.refund.args,
  handler: (ctx, args) => defs.refund.handler(ctx, args),
});

// === Internal Mutations (for payment actions and webhooks) ===

/** Create payment record without auth — used by payment verification actions */
export const internalCreate = internalMutation(defs.create);

/** Update payment status without auth — used by webhooks */
export const internalUpdateStatus = internalMutation(defs.updateStatus);
