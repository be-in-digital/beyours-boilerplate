import { mutation, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
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

export const pageForSending = internalQuery(defs.pageForSending);
/**
 * Confirm the double opt-in, and start whatever welcome sequence is waiting.
 *
 * The hook lives here rather than in the shared handler because scheduling
 * needs `internal.*`, which only an app has. It is the one automation trigger
 * the current schema can detect — see `automationDispatch` for what the other
 * four are missing.
 *
 * Scheduled rather than awaited: a welcome email is not a reason for a
 * confirmation to fail, and the mutation should commit either way.
 */
export const confirmDoubleOptIn = internalMutation({
  args: defs.confirmDoubleOptIn.args,
  handler: async (ctx, args) => {
    const result = await defs.confirmDoubleOptIn.handler(ctx, args);

    // The shared handler returns the confirmed subscriber's id, untyped —
    // naming the table is what stops `ctx.db.get` widening to every row shape
    // in the schema.
    const subscriber = await ctx.db.get(result as Id<"emailSubscribers">);

    if (subscriber) {
      await ctx.scheduler.runAfter(
        0,
        internal.emailAutomationActions.startWelcome,
        { storeId: subscriber.storeId, subscriberId: subscriber._id }
      );
    }

    return result;
  },
});
export const unsubscribe = internalMutation(defs.unsubscribe);
export const markBounced = internalMutation(defs.markBounced);
export const markComplained = internalMutation(defs.markComplained);
export const updateMetadataIncremental = internalMutation(defs.updateMetadataIncremental);

/**
 * One subscriber, for a caller with no session.
 *
 * The automation engine re-reads the subscriber before every step: someone who
 * has unsubscribed, bounced or complained since the trigger must not receive
 * the rest of a sequence they are no longer part of.
 */
export const getByIdInternal = internalQuery({
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});
