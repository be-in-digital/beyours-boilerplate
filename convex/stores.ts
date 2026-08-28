import { query, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import * as defs from "@be-in-digital/convex-functions/stores";
import { storeQuery, storeMutation, authedQuery, authedMutation } from "./lib/storeFunctions";
import { getAuthUser, requireStaff } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Role } from "@be-in-digital/core/auth/rbac";

// === Queries (public for storefront) ===
// Strip sensitive data (printConfig.apiKey) from public queries

function stripSensitiveStoreData<T>(store: T): T {
  if (!store || typeof store !== "object") return store;
  const s = store as Record<string, unknown>;
  if (!s.printConfig || typeof s.printConfig !== "object") return store;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey: _apiKey, ...safePrintConfig } = s.printConfig as Record<string, unknown>;
  return { ...s, printConfig: safePrintConfig } as T;
}

// @public-by-design: public storefront info; sensitive printConfig is stripped above
export const list = query({
  args: defs.list.args,
  handler: async (ctx) => {
    const stores = await defs.list.handler(ctx);
    return stores.map(stripSensitiveStoreData);
  },
});

/**
 * The administration list: every establishment, drafts included.
 *
 * It cannot go through `storeQuery` — the list spans every store, so there is
 * no single store to scope to — so the gate is checked inline, the way `create`
 * does it. `requireStaff` rather than `stores:read`: the kitchen and delivery
 * roles do not hold that permission and still render behind `StoreGuard`,
 * which is built from this list.
 *
 * `printConfig.apiKey` is stripped here as it is on the public queries. The one
 * read that returns it is `getAdminById`, behind `stores:read`.
 */
// @guarded-inline: staff-only checked in the handler; the list spans every store
export const listAll = authedQuery({
  args: defs.listAll.args,
  handler: async (ctx) => {
    await requireStaff(ctx);
    const stores = await defs.listAll.handler(ctx);
    return stores.map(stripSensitiveStoreData);
  },
});

// @public-by-design: public storefront info; sensitive printConfig is stripped above
export const getById = query({
  args: defs.getById.args,
  handler: async (ctx, args) => {
    const store = await defs.getById.handler(ctx, args);
    return stripSensitiveStoreData(store);
  },
});

// Internal (no-auth) variant for webhook handlers, which run without a user identity.
export const internalGetById = internalQuery({
  args: defs.getById.args,
  handler: async (ctx, args) => defs.getById.handler(ctx, args),
});

// @public-by-design: public storefront info; sensitive printConfig is stripped above
export const getBySlug = query({
  args: defs.getBySlug.args,
  handler: async (ctx, args) => {
    const store = await defs.getBySlug.handler(ctx, args);
    return stripSensitiveStoreData(store);
  },
});

/** The store IS the document here: `args.id` is the store id. */
const storeIdFromIdArg = async (_ctx: QueryCtx, args: { id: Id<"stores"> }) =>
  args.id;

/** Admin-only query: returns full store data including printConfig.apiKey */
export const getAdminById = storeQuery({
  permission: "stores:read",
  args: defs.getById.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

// === Mutations (protected with store access) ===

/**
 * Creating a store is the one mutation the store-scoped seam cannot guard:
 * there is no store yet to check membership against. It was left as an
 * auth-only wrapper, so any signed-up customer could create restaurants.
 * `stores:write` is held by SUPER_ADMIN and CLIENT_ADMIN.
 */
// @guarded-inline: stores:write checked in the handler; no store exists yet to scope to
export const create = authedMutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!hasPermission(user.role as Role, "stores:write")) {
      throw new Error("Access denied: stores:write required");
    }
    return defs.create.handler(ctx, args);
  },
});

export const update = storeMutation({
  permission: "stores:write",
  args: defs.update.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const updateHours = storeMutation({
  permission: "stores:write",
  args: defs.updateHours.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateHours.handler(ctx, args),
});

export const updateOverrides = storeMutation({
  permission: "stores:write",
  args: defs.updateOverrides.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOverrides.handler(ctx, args),
});

export const updateAddress = storeMutation({
  permission: "stores:write",
  args: defs.updateAddress.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateAddress.handler(ctx, args),
});

export const updatePrintConfig = storeMutation({
  permission: "stores:write",
  args: defs.updatePrintConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updatePrintConfig.handler(ctx, args),
});

export const updateDisplayConfig = storeMutation({
  permission: "stores:write",
  args: defs.updateDisplayConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateDisplayConfig.handler(ctx, args),
});

export const updateSoundConfig = storeMutation({
  permission: "stores:write",
  args: defs.updateSoundConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateSoundConfig.handler(ctx, args),
});

export const updateOrderConfirmation = storeMutation({
  permission: "stores:write",
  args: defs.updateOrderConfirmation.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOrderConfirmation.handler(ctx, args),
});

export const updateOrderMode = storeMutation({
  permission: "stores:write",
  args: defs.updateOrderMode.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOrderMode.handler(ctx, args),
});

export const updateTrendingMode = storeMutation({
  permission: "stores:write",
  args: defs.updateTrendingMode.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateTrendingMode.handler(ctx, args),
});

export const remove = storeMutation({
  permission: "stores:delete",
  args: defs.remove.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
