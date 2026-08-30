import { internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailAutomations";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const emailAutomationsStoreId = storeIdFromDocument("Automation not found");

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "marketing:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = storeQuery({
  permission: "marketing:read",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const listActive = storeQuery({
  permission: "marketing:read",
  args: defs.listActive.args,
  handler: (ctx, args) => defs.listActive.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const activate = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.activate.args,
  handler: (ctx, args) => defs.activate.handler(ctx, args),
});

export const pause = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.pause.args,
  handler: (ctx, args) => defs.pause.handler(ctx, args),
});

// === Internal mutations ===

export const incrementStats = internalMutation(defs.incrementStats);

/**
 * The same rows, for the engine.
 *
 * `getById` and `listActive` are store-scoped, and a scheduled automation step
 * has no identity to scope with. The authorisation happened when the owner
 * activated the automation.
 */
export const getByIdInternal = internalQuery({
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const listActiveByTriggerInternal = internalQuery({
  args: defs.listActiveByTrigger.args,
  handler: (ctx, args) => defs.listActiveByTrigger.handler(ctx, args),
});

export const listActiveInternal = internalQuery({
  args: defs.listActive.args,
  handler: (ctx, args) => defs.listActive.handler(ctx, args),
});
