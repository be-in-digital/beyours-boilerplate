import { mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailSubscribers";
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

export const getByEmail = storeQuery({
  args: defs.getByEmail.args,
  handler: (ctx, args) => defs.getByEmail.handler(ctx, args),
});

export const countByStatus = storeQuery({
  args: defs.countByStatus.args,
  handler: (ctx, args) => defs.countByStatus.handler(ctx, args),
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

export const addTag = authedMutation({
  args: defs.addTag.args,
  handler: (ctx, args) => defs.addTag.handler(ctx, args),
});

export const removeTag = authedMutation({
  args: defs.removeTag.args,
  handler: (ctx, args) => defs.removeTag.handler(ctx, args),
});

export const importBatch = authedMutation({
  args: defs.importBatch.args,
  handler: (ctx, args) => defs.importBatch.handler(ctx, args),
});

/**
 * Public mutation — allows storefront visitors to subscribe to the newsletter.
 * Only accepts source "storefront_form" to prevent abuse.
 */
export const subscribe = mutation({
  args: {
    storeId: defs.create.args.storeId,
    email: defs.create.args.email,
  },
  handler: async (ctx, args) => {
    return defs.create.handler(ctx, {
      ...args,
      source: "storefront_form",
      tags: ["newsletter"],
    });
  },
});

// === Internal mutations (called by schedulers / HTTP actions) ===

export const confirmDoubleOptIn = internalMutation(defs.confirmDoubleOptIn);
export const unsubscribe = internalMutation(defs.unsubscribe);
export const markBounced = internalMutation(defs.markBounced);
export const markComplained = internalMutation(defs.markComplained);
export const updateMetadataIncremental = internalMutation(defs.updateMetadataIncremental);
