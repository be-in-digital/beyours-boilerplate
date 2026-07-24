import { query, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import * as defs from "@be-in-digital/convex-functions/stores";
import { storeQuery, storeMutation, authedMutation } from "./lib/storeFunctions";

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

export const list = query({
  args: defs.list.args,
  handler: async (ctx) => {
    const stores = await defs.list.handler(ctx);
    return stores.map(stripSensitiveStoreData);
  },
});

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
  args: defs.getById.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.getById.handler(ctx, args),
});

// === Mutations (protected with store access) ===

export const create = authedMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = storeMutation({
  args: defs.update.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const updateHours = storeMutation({
  args: defs.updateHours.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateHours.handler(ctx, args),
});

export const updateOverrides = storeMutation({
  args: defs.updateOverrides.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOverrides.handler(ctx, args),
});

export const updateAddress = storeMutation({
  args: defs.updateAddress.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateAddress.handler(ctx, args),
});

export const updatePrintConfig = storeMutation({
  args: defs.updatePrintConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updatePrintConfig.handler(ctx, args),
});

export const updateDisplayConfig = storeMutation({
  args: defs.updateDisplayConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateDisplayConfig.handler(ctx, args),
});

export const updateSoundConfig = storeMutation({
  args: defs.updateSoundConfig.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateSoundConfig.handler(ctx, args),
});

export const updateOrderConfirmation = storeMutation({
  args: defs.updateOrderConfirmation.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOrderConfirmation.handler(ctx, args),
});

export const updateOrderMode = storeMutation({
  args: defs.updateOrderMode.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateOrderMode.handler(ctx, args),
});

export const updateTrendingMode = storeMutation({
  args: defs.updateTrendingMode.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.updateTrendingMode.handler(ctx, args),
});

export const remove = storeMutation({
  args: defs.remove.args,
  storeIdFrom: storeIdFromIdArg,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
