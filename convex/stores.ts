import { query, mutation, internalQuery } from "./_generated/server";
import * as defs from "@be-in-digital/convex-functions/stores";
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth";

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

/** Admin-only query: returns full store data including printConfig.apiKey */
export const getAdminById = query({
  args: defs.getById.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.getById.handler(ctx, args);
  },
});

// === Mutations (protected with store access) ===

export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return defs.create.handler(ctx, args);
  },
});

export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.update.handler(ctx, args);
  },
});

export const updateHours = mutation({
  args: defs.updateHours.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateHours.handler(ctx, args);
  },
});

export const updateOverrides = mutation({
  args: defs.updateOverrides.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateOverrides.handler(ctx, args);
  },
});

export const updateAddress = mutation({
  args: defs.updateAddress.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateAddress.handler(ctx, args);
  },
});

export const updatePrintConfig = mutation({
  args: defs.updatePrintConfig.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updatePrintConfig.handler(ctx, args);
  },
});

export const updateDisplayConfig = mutation({
  args: defs.updateDisplayConfig.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateDisplayConfig.handler(ctx, args);
  },
});

export const updateSoundConfig = mutation({
  args: defs.updateSoundConfig.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateSoundConfig.handler(ctx, args);
  },
});

export const updateOrderConfirmation = mutation({
  args: defs.updateOrderConfirmation.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateOrderConfirmation.handler(ctx, args);
  },
});

export const updateOrderMode = mutation({
  args: defs.updateOrderMode.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateOrderMode.handler(ctx, args);
  },
});

export const updateTrendingMode = mutation({
  args: defs.updateTrendingMode.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.updateTrendingMode.handler(ctx, args);
  },
});

export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.id);
    return defs.remove.handler(ctx, args);
  },
});
