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
import {
  releaseImageToProductQuota as releaseImageToProductQuota_,
  reserveImageToProductQuota as reserveImageToProductQuota_,
} from "@be-in-digital/convex-functions/blogAutoGuards";

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
 * Take one Image-to-Product analysis out of this month's quota.
 *
 * Reserved before the first paid call, not counted after the last one. The
 * analysis makes three OpenAI requests — a vision pass, an enrichment pass and
 * up to several image generations — and the counter used to move seventy-five
 * lines after the check, so concurrent requests all read the same count and all
 * passed. Reading and writing in one mutation is what makes the cap a cap.
 */
export const reserveImageToProductQuota = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return reserveImageToProductQuota_(ctx, ownerId);
  },
});

/** Hand the analysis slot back when nothing came of it. */
export const releaseImageToProductQuota = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    await releaseImageToProductQuota_(ctx, ownerId);
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
