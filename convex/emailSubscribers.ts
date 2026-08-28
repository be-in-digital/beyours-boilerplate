import { mutation, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailSubscribers";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const emailSubscribersStoreId = storeIdFromDocument("Subscriber not found");

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "marketing:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = storeQuery({
  permission: "marketing:read",
  storeIdFrom: emailSubscribersStoreId,
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const getByEmail = storeQuery({
  permission: "marketing:read",
  args: defs.getByEmail.args,
  handler: (ctx, args) => defs.getByEmail.handler(ctx, args),
});

export const countByStatus = storeQuery({
  permission: "marketing:read",
  args: defs.countByStatus.args,
  handler: (ctx, args) => defs.countByStatus.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSubscribersStoreId,
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSubscribersStoreId,
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const addTag = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSubscribersStoreId,
  args: defs.addTag.args,
  handler: (ctx, args) => defs.addTag.handler(ctx, args),
});

export const removeTag = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSubscribersStoreId,
  args: defs.removeTag.args,
  handler: (ctx, args) => defs.removeTag.handler(ctx, args),
});

export const importBatch = storeMutation({
  permission: "marketing:write",
  args: defs.importBatch.args,
  handler: (ctx, args) => defs.importBatch.handler(ctx, args),
});

/**
 * Public mutation — allows storefront visitors to subscribe to the newsletter.
 * Only accepts source "storefront_form" to prevent abuse.
 */
// @public-by-design: newsletter sign-up from the storefront (rate limiting tracked as S3-7)
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
