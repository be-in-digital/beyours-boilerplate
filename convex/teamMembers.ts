import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/teamMembers";
import * as profileDefs from "@be-in-digital/convex-functions/userProfiles";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import {
  assertCanManageMember,
  assertInvitationAcceptable,
  invitationGrant,
  revocationEffect,
} from "@be-in-digital/convex-functions/teamAccess";
import { Role } from "@be-in-digital/core/auth/rbac";

const memberStoreId = storeIdFromDocument("Team member not found");

/**
 * Guard for the team roster.
 *
 * Every mutation here used to be an `authedMutation` — "are you logged in" and
 * nothing else — so any account could invite, promote or remove staff in any
 * restaurant. The store-scoped seam alone is not enough either: a member can be
 * chain-wide (`allStores: true`, no storeId), and those must stay a super
 * admin's business. `assertCanManageMember` owns both rules.
 */
async function requireCanManage(
  ctx: Parameters<typeof getAuthUser>[0],
  member: { storeId?: string; allStores: boolean }
) {
  const user = await getAuthUser(ctx);
  assertCanManageMember({
    actor: { userId: user.userId, role: user.role, storeIds: user.storeIds },
    member,
  });
  return user;
}

/**
 * Take back what a membership granted.
 *
 * The counterpart of `acceptInvitation`: since `userProfiles` is the single
 * source of authority, removing someone from the roster has to write there too,
 * or the removal is cosmetic.
 */
async function revokeProfileAccess(
  ctx: Parameters<typeof getAuthUser>[0] & {
    db: { patch: (id: unknown, updates: unknown) => Promise<unknown> };
  },
  member: { userId?: string; storeId?: string; allStores: boolean }
) {
  if (!member.userId) return;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: { eq: (f: string, v: unknown) => unknown }) =>
      q.eq("userId", member.userId)
    )
    .first();
  if (!profile) return;

  const next = revocationEffect({
    profile: { role: profile.role as Role, storeIds: profile.storeIds },
    storeId: member.storeId,
    allStores: member.allStores,
  });

  if (next.role === profile.role && next.storeIds.length === profile.storeIds.length) {
    return;
  }

  await ctx.db.patch(profile._id, {
    role: next.role,
    storeIds: next.storeIds,
    updatedAt: Date.now(),
  });
}

// === QUERIES ===

export const list = storeQuery({
  permission: "team:read",
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getByRole = storeQuery({
  permission: "team:read",
  args: defs.getByRole.args,
  handler: (ctx, args) => defs.getByRole.handler(ctx, args),
});

/**
 * The caller's own memberships.
 *
 * `getByUser` used to take an arbitrary `userId` behind an auth-only guard, so
 * any account could read anyone's role, permissions and store list.
 */
// @guarded-inline: derives the caller from the session; never takes a userId
export const getMyMemberships = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return defs.getByUser.handler(ctx, { userId: identity.subject });
  },
});

export const getByEmail = storeQuery({
  permission: "team:read",
  args: {
    email: v.string(),
    storeId: v.id("stores"),
  },
  handler: (ctx, args) => defs.getByEmail.handler(ctx, args),
});

// @public-by-design: an invitee resolves their invitation before they have an
// account. Access is guarded by the single-use token, not by a session.
export const getByInvitationToken = query(defs.getByInvitationToken);

// Internal query for actions to read member data
export const getById = internalQuery({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Authorisation check for the invitation ACTIONS.
 *
 * `teamMembersEmail.sendInvitationEmail` is the real public entry point — the
 * team screen calls it, and it reaches the roster through `inviteInternal`,
 * bypassing the guard on `invite`. It only checked that the caller was logged
 * in, so any account could invite itself as `manager` on any store, or
 * chain-wide with `allStores: true`.
 *
 * Actions have no `ctx.db`, so the check runs here and the caller's identity
 * propagates through `runQuery`.
 */
export const internalAssertCanManage = internalQuery({
  args: {
    storeId: v.optional(v.id("stores")),
    allStores: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireCanManage(ctx, {
      storeId: args.storeId,
      allStores: args.allStores,
    });
    return true;
  },
});

/** Same check, for an action holding only a member id. */
export const internalAssertCanManageMember = internalQuery({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) throw new Error("Team member not found");
    await requireCanManage(ctx, member);
    return true;
  },
});

// === MUTATIONS ===

// @guarded-inline: `requireCanManage` applies the roster policy, which the
// store-scoped seam cannot express (chain-wide members have no storeId)
export const invite = mutation({
  args: defs.invite.args,
  handler: async (ctx, args) => {
    await requireCanManage(ctx, {
      storeId: args.storeId,
      allStores: args.allStores ?? false,
    });
    return defs.invite.handler(ctx, args);
  },
});

// Internal version of invite (called from sendInvitationEmail action)
export const inviteInternal = internalMutation({
  args: defs.invite.args,
  handler: async (ctx, args) => {
    return defs.invite.handler(ctx, args);
  },
});

/**
 * Accept an invitation and receive the rights it promised.
 *
 * Two defects met here. The mutation had no authentication at all and took the
 * `userId` to bind as an argument, so a captured token could attach any account
 * to the position. And accepting only stamped `teamMembers.userId`, while
 * `getAuthUser` resolves rights from `userProfiles` and never reads this table —
 * an invited manager accepted and received nothing.
 *
 * The caller is now derived from the session, and acceptance provisions the
 * profile that the authorisation chain actually consults.
 */
// @guarded-inline: the invitation token authorises, and the bound account is
// derived from the session rather than taken as an argument
export const acceptInvitation = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Connectez-vous pour accepter cette invitation.");
    }

    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_invitationToken", (q) =>
        q.eq("invitationToken", args.token)
      )
      .first();

    if (!member) throw new Error("Invitation introuvable.");

    const now = Date.now();
    try {
      assertInvitationAcceptable({ member, now });
    } catch (error) {
      // Record the expiry we just detected, so the roster stops showing it as
      // pending, then surface the reason.
      if (member.invitationStatus === "pending") {
        await ctx.db.patch(member._id, {
          invitationStatus: "expired",
          updatedAt: now,
        });
      }
      throw error;
    }

    await ctx.db.patch(member._id, {
      userId: identity.subject,
      invitationStatus: "accepted",
      invitationToken: undefined,
      updatedAt: now,
    });

    // The bridge: give the accepted member the profile the auth chain reads.
    //
    // Merged against the existing profile, never replacing it — otherwise an
    // invitation becomes a demotion vector, and joining a second restaurant
    // means losing the first.
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();

    const grant = invitationGrant(
      member,
      existingProfile
        ? {
            role: existingProfile.role as Role,
            storeIds: existingProfile.storeIds,
          }
        : null
    );

    return profileDefs.upsert.handler(ctx, {
      userId: identity.subject,
      role: grant.role,
      storeIds: grant.storeIds,
      permissions: existingProfile?.permissions ?? [],
    });
  },
});

export const resendInvitation = storeMutation({
  permission: "team:write",
  args: defs.resendInvitation.args,
  storeIdFrom: memberStoreId,
  handler: (ctx, args) => defs.resendInvitation.handler(ctx, args),
});

// Internal version (called from resendInvitationEmail action)
export const resendInvitationInternal = internalMutation({
  args: defs.resendInvitation.args,
  handler: async (ctx, args) => {
    return defs.resendInvitation.handler(ctx, args);
  },
});

// @guarded-inline: `requireCanManage` applies the roster policy, which the
// store-scoped seam cannot express (chain-wide members have no storeId)
export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    await requireCanManage(ctx, {
      storeId: args.storeId,
      allStores: args.allStores ?? false,
    });
    return defs.create.handler(ctx, args);
  },
});

// @guarded-inline: `requireCanManage` applies the roster policy, which the
// store-scoped seam cannot express (chain-wide members have no storeId)
export const update = mutation({
  args: defs.update.args,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Team member not found");
    // Checked against the member as it stands AND as it would become, so a
    // store-bound member cannot be promoted to chain-wide by an owner.
    await requireCanManage(ctx, existing);
    if (args.storeId !== undefined || args.allStores !== undefined) {
      await requireCanManage(ctx, {
        storeId: args.storeId ?? existing.storeId,
        allStores: args.allStores ?? existing.allStores,
      });
    }
    return defs.update.handler(ctx, args);
  },
});

// @guarded-inline: `requireCanManage` applies the roster policy, which the
// store-scoped seam cannot express (chain-wide members have no storeId)
export const toggleActive = mutation({
  args: defs.toggleActive.args,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Team member not found");
    await requireCanManage(ctx, existing);

    const result = await defs.toggleActive.handler(ctx, args);

    // Deactivating must actually take the rights away. Without this the member
    // simply looks inactive on the team screen while `userProfiles` — the record
    // the authorisation chain reads — still grants everything.
    const reread = await ctx.db.get(args.id);
    if (reread && reread.isActive === false && reread.userId) {
      await revokeProfileAccess(ctx, reread);
    }
    return result;
  },
});

// @guarded-inline: `requireCanManage` applies the roster policy, which the
// store-scoped seam cannot express (chain-wide members have no storeId)
export const remove = mutation({
  args: defs.remove.args,
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Team member not found");
    await requireCanManage(ctx, existing);

    // Revoke BEFORE deleting: once the row is gone there is nothing left to
    // tell us which store the person is losing. A dismissed employee used to
    // vanish from the roster and keep `manager` on the restaurant.
    if (existing.userId) await revokeProfileAccess(ctx, existing);

    return defs.remove.handler(ctx, args);
  },
});
