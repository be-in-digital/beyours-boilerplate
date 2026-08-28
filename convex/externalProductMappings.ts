import { internalQuery, internalMutation } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/externalProductMappings";
import { storeQuery, storeMutation } from "./lib/storeFunctions";

// Mapping between our products and their ids on Uber Eats / Deliveroo. This is
// integration plumbing: no storefront reads it, and it was entirely public.
//
// Two surfaces, deliberately:
//  - the store-scoped ones below, for the admin;
//  - the internal ones, for the webhook and import paths. Those run as
//    `internalAction`s with no user identity, so a store-scoped guard there
//    would reject Uber Eats and Deliveroo themselves.

export const listByStorePlatform = storeQuery({
  permission: "products:read",
  args: defs.listByStorePlatform.args,
  handler: (ctx, args) => defs.listByStorePlatform.handler(ctx, args),
});

export const upsert = storeMutation({
  permission: "products:write",
  args: defs.upsert.args,
  handler: (ctx, args) => defs.upsert.handler(ctx, args),
});

export const removeAllByStorePlatform = storeMutation({
  permission: "products:write",
  args: defs.removeAllByStorePlatform.args,
  handler: (ctx, args) => defs.removeAllByStorePlatform.handler(ctx, args),
});

// `getByInternal` / `getByExternal` / `remove` resolve a mapping by product or
// external id and carry no storeId, so they cannot be store-scoped. They have
// no UI caller — internal is the whole surface they need.
export const internalGetByInternal = internalQuery(defs.getByInternal);
export const internalGetByExternal = internalQuery(defs.getByExternal);
export const internalListByStorePlatform = internalQuery(defs.listByStorePlatform);
export const internalUpsert = internalMutation(defs.upsert);
export const internalRemove = internalMutation(defs.remove);
