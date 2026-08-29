import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
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

/**
 * Does this deployment still need its first administrator?
 *
 * `/setup` is the only screen a fresh deployment can offer, and without this it
 * would have to guess: it would show a token field to someone whose deployment
 * was configured months ago, and it could not tell "wrong token" from "nobody
 * ever set one". Both answers are deployment state, not credentials — knowing
 * that a bootstrap token EXISTS gets you no closer to holding it, and the claim
 * still refuses everything but the token itself.
 */
// @public-by-design: reports deployment state, reveals no secret, and is the
// only way the setup screen can say something true before anyone is an admin.
export const bootstrapStatus = query({
  args: {},
  handler: async (ctx) => {
    const superAdmin = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", Role.SUPER_ADMIN))
      .first();

    return {
      /** True once somebody holds the super-admin seat: `/setup` is closed. */
      claimed: superAdmin !== null,
      /** False when `ADMIN_BOOTSTRAP_TOKEN` is unset — nobody can claim it. */
      configured: Boolean(process.env.ADMIN_BOOTSTRAP_TOKEN),
    };
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
    if (!identity) {
      throw new ConvexError({
        code: "not_authenticated",
        message: "Connectez-vous avant de réclamer le siège d'administrateur.",
      });
    }

    // ConvexError, not Error: Convex redacts a plain thrown message in
    // production and the UI receives "Server Error". These three refusals are
    // the only feedback an operator gets while setting a deployment up, and
    // "Server Error" for all three is indistinguishable from a broken backend.
    // `data` survives the redaction; the `code` is what the screen switches on,
    // so the copy never has to guess from a string.
    const expected = process.env.ADMIN_BOOTSTRAP_TOKEN;
    if (!expected) {
      throw new ConvexError({
        code: "bootstrap_not_configured",
        message:
          "L'amorçage administrateur n'est pas configuré sur ce déploiement.",
      });
    }
    if (!timingSafeEqualString(args.bootstrapToken, expected)) {
      throw new ConvexError({
        code: "bootstrap_token_invalid",
        message: "Jeton d'amorçage invalide.",
      });
    }

    const superAdmins = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("role"), Role.SUPER_ADMIN))
      .collect();

    if (!canClaimFirstAdmin({ existingSuperAdminCount: superAdmins.length })) {
      throw new ConvexError({
        code: "bootstrap_already_claimed",
        message: "Un super administrateur existe déjà sur ce déploiement.",
      });
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
