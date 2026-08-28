/**
 * Internal auth helpers for actions that don't have ctx.db.
 *
 * Actions use ctx.runQuery to call these internal queries,
 * which propagate the auth context.
 */

import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireStorePermission, getAuthUser } from "@be-in-digital/convex-functions/auth";
import { hasPermission, type Permission } from "@be-in-digital/core/auth/rbac";
import { checkImageToProductAccess } from "@be-in-digital/convex-functions/blogAutoGuards";
import { incrementImageToProductUsageCore } from "@be-in-digital/convex-functions/blogAutoGenerate";

/**
 * Verify the current user has a specific permission on a store.
 * Call from actions via ctx.runQuery(internal.authHelpers.checkStorePermission, {...})
 */
export const checkStorePermission = internalQuery({
  args: {
    storeId: v.id("stores"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await requireStorePermission(ctx, args.storeId, args.permission as any);
    return true;
  },
});

/**
 * Check Image-to-Product quota for an owner.
 * Call from actions via ctx.runQuery(internal.authHelpers.checkImageToProductQuota, {...})
 */
export const checkImageToProductQuota = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return checkImageToProductAccess(ctx, ownerId);
  },
});

/**
 * Increment Image-to-Product usage count for an owner.
 * Call from actions via ctx.runMutation(internal.authHelpers.incrementImageToProductUsage, {...})
 */
export const incrementImageToProductUsage = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    await incrementImageToProductUsageCore(ctx, ownerId);
  },
});

/**
 * Verify the caller holds a permission by role, independently of any store.
 *
 * For deployment-wide operations that have no storeId to check against:
 * connecting a payment provider, starting an Uber Eats OAuth flow, asking S3
 * for an upload URL. `checkStorePermission` cannot express those — there is no
 * store — and "is logged in" is not an answer either, because that includes
 * every customer who has ever ordered a pizza.
 *
 * `hasPermission` fails closed on an unknown role or permission string, so a
 * typo denies rather than grants.
 */
export const checkPermission = internalQuery({
  args: { permission: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    if (!hasPermission(user.role, args.permission as Permission)) {
      throw new Error("Vous n'avez pas les droits nécessaires pour cette opération.");
    }
    return true;
  },
});
