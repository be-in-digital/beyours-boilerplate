import * as defs from "@be-in-digital/convex-functions/emailSegments";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";

const emailSegmentsStoreId = storeIdFromDocument("Segment not found");

// === Queries (auth-protected) ===

export const list = storeQuery({
  permission: "marketing:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getById = storeQuery({
  permission: "marketing:read",
  storeIdFrom: emailSegmentsStoreId,
  args: defs.getById.args,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

export const countMatchingSubscribers = storeQuery({
  permission: "marketing:read",
  args: defs.countMatchingSubscribers.args,
  handler: (ctx, args) => defs.countMatchingSubscribers.handler(ctx, args),
});

// === Mutations (auth-protected) ===

export const create = storeMutation({
  permission: "marketing:write",
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSegmentsStoreId,
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSegmentsStoreId,
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});

export const duplicate = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSegmentsStoreId,
  args: defs.duplicate.args,
  handler: (ctx, args) => defs.duplicate.handler(ctx, args),
});

export const refreshCount = storeMutation({
  permission: "marketing:write",
  storeIdFrom: emailSegmentsStoreId,
  args: defs.refreshCount.args,
  handler: (ctx, args) => defs.refreshCount.handler(ctx, args),
});
