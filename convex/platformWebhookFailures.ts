import { internalMutation, query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/platformWebhookFailures";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Permission } from "@be-in-digital/core/auth/rbac";

const PERM_ORDERS_READ = "orders:read" as Permission;

/**
 * The dead-letter queue is not scoped to one establishment: an entry whose
 * reason is `unidentified_store` has, by definition, no establishment. So it
 * cannot go through `storeQuery`, and the permission is checked directly.
 */
async function requireOrdersRead(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  if (!hasPermission(user.role, PERM_ORDERS_READ)) {
    throw new Error('Permission "orders:read" requise');
  }
  return user;
}

// === INTERNAL (called from webhook handlers, after signature verification) ===

/** Keep a delivery-platform event we could not act on. */
export const record = internalMutation(defs.record);

/** Flag whether the platform really accepted an order. */
export const setPlatformSyncStatus = internalMutation(defs.setPlatformSyncStatus);

// === OPERATOR-FACING ===

// @guarded-inline: requireOrdersRead resolves the caller with getAuthUser and
// checks "orders:read" before any document is returned — these rows carry raw
// platform payloads.
export const listUnresolved = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOrdersRead(ctx);
    return defs.listUnresolved.handler(ctx, args);
  },
});

// @guarded-inline: requireOrdersRead checks the caller before the write.
export const markResolved = mutation({
  args: { id: v.id("platformWebhookFailures") },
  handler: async (ctx, args) => {
    const user = await requireOrdersRead(ctx);
    return defs.markResolved.handler(ctx, {
      id: args.id,
      resolvedBy: user.userId,
    });
  },
});
