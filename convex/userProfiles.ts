import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/userProfiles";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import {
  assertCanAssignProfile,
  canClaimFirstAdmin,
} from "@be-in-digital/convex-functions/profileProvisioning";
import { Role } from "@be-in-digital/core/auth/rbac";


/**
 * Compare two secrets without leaking their length or content through timing.
 *
 * A plain `===` returns on the first differing byte, which is enough to
 * recover a token one character at a time.
 */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// === Queries ===
//
// NOTE: `getByUserId` used to be exported here as a bare `query(defs.getByUserId)`.
// Its core performs no identity check at all, so anyone could read any user's
// role, permissions and store list by guessing a user id. Its only caller —
// `AdminAuthSync` — was reading the *current* user's own profile, which is what
// `getMyProfile` below does safely.

/**
 * Get the authenticated user's own profile.
 */
// @guarded-inline: session-derived, or policy-checked in the handler
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
  },
});

// === Mutations ===

/**
 * Create or update another user's profile.
 *
 * The previous guard only rejected the literal strings "super_admin" and
 * "client_admin", so `manager` — which carries products, orders and customers
 * write access — passed straight through, on any store id the caller chose.
 * The whole policy now lives in `assertCanAssignProfile`.
 */
// @guarded-inline: session-derived, or policy-checked in the handler
export const upsert = mutation({
  args: defs.upsert.args,
  handler: async (ctx, args) => {
    const actor = await getAuthUser(ctx);

    // `upsert` OVERWRITES role and storeIds, so the policy has to see who the
    // target is today — not only the role being requested.
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    assertCanAssignProfile({
      actor: {
        userId: actor.userId,
        role: actor.role,
        storeIds: actor.storeIds,
      },
      target: {
        userId: args.userId,
        role: args.role as Role,
        storeIds: args.storeIds,
        permissions: args.permissions,
      },
      existingTarget: existing
        ? { role: existing.role as Role, storeIds: existing.storeIds }
        : null,
    });

    return defs.upsert.handler(ctx, args);
  },
});

/**
 * Claim the first super-admin seat on a deployment that has none.
 *
 * Provisioning requires a super admin, and a fresh deployment starts without
 * one — there would otherwise be no way to appoint the first administrator
 * short of editing the database by hand.
 *
 * "Self-closing" was not enough. Sign-up is open on the storefront, so on a
 * fresh deployment the first authenticated caller took the whole thing — and
 * that need not be the restaurateur. Convex function names are discoverable
 * from the client bundle; "nothing in the UI calls it" protects no one.
 *
 * So the claim now also demands a secret only whoever deployed the backend
 * holds. It FAILS CLOSED: with `ADMIN_BOOTSTRAP_TOKEN` unset there is no way
 * in at all, because an unset variable that waved everyone through would
 * recreate the hole on precisely the deployments nobody has configured yet.
 */
// @guarded-inline: session-derived, or policy-checked in the handler
export const claimFirstAdmin = mutation({
  args: { bootstrapToken: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const expected = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!expected) {
      throw new Error(
        "L'amorçage administrateur n'est pas configuré sur ce déploiement."
      );
    }
    if (!timingSafeEqualString(args.bootstrapToken, expected)) {
      throw new Error("Jeton d'amorçage invalide.");
    }

    const superAdmins = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("role"), Role.SUPER_ADMIN))
      .collect();

    if (!canClaimFirstAdmin({ existingSuperAdminCount: superAdmins.length })) {
      throw new Error(
        "Un super administrateur existe déjà sur ce déploiement."
      );
    }

    // Reuse the shared upsert so the profile is built with every field the
    // schema requires, rather than a second hand-rolled insert that drifts.
    return defs.upsert.handler(ctx, {
      userId: identity.subject,
      role: Role.SUPER_ADMIN,
      storeIds: [],
      permissions: [],
    });
  },
});

/**
 * Update own profile (customer-facing: phones, language, avatar)
 */
// @guarded-inline: session-derived, or policy-checked in the handler
export const updateMyProfile = mutation({
  args: {
    phones: defs.updateProfile.args.phones,
    language: defs.updateProfile.args.language,
    avatarUrl: defs.updateProfile.args.avatarUrl,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    return defs.updateProfile.handler(ctx, {
      userId: identity.subject,
      ...args,
    });
  },
});

// === Internal ===

/**
 * Provision a profile without an authenticated actor.
 *
 * Internal only — reachable from seed scripts and server-side flows through the
 * deploy key, never from a browser.
 */
export const internalUpsert = internalMutation(defs.upsert);
