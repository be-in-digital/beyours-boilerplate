import { internalMutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/emailAutomations";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const emailAutomationsStoreId = storeIdFromDocument("Automation not found");

// === Queries (auth-protected) ===

export const listActive = storeQuery({
  permission: "marketing:read",
  args: defs.listActive.args,
  handler: (ctx, args) => defs.listActive.handler(ctx, args),
});

// === Mutations (auth-protected) ===

// @kept-callerless: no screen calls these two. `apps/reference`'s ops scripts do
// — `scripts/verify-resume-and-automation.mjs` creates an automation and
// activates it to prove the internal dispatcher resumes a stopped send. The two
// apps' `convex/` trees must stay byte-identical, so they stay public in both.
// The rest of this module's CRUD had no caller of any kind and was removed
// (#413); the dispatch side has always lived internal, in `automationDispatch`.
export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const activate = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailAutomationsStoreId,
  args: defs.activate.args,
  handler: (ctx, args) => defs.activate.handler(ctx, args),
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
