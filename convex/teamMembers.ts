import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/teamMembers";
import * as profileDefs from "@be-in-digital/convex-functions/userProfiles";
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions";
import { getAuthUser } from "@be-in-digital/convex-functions/auth";
import {
  assertCanManageMember,
  assertInvitationAcceptable,
  invitationGrant,
  invitationModules,
  membershipUpdateEffect,
  revocationEffect,
  sweepInvitation,
  TeamAccessError,
  type MembershipProjection,
} from "@be-in-digital/convex-functions/teamAccess";
import { Role } from "@be-in-digital/core/auth/rbac";
import {
  ACCESS_AUDIT_OPERATIONS,
  recordAccessAudit,
} from "@be-in-digital/convex-functions/accessAudit";

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

  // A dismissal is the entry an owner comes looking for months later, and it
  // was the one change that left no trace at all.
  await recordAccessAudit(ctx, {
    targetUserId: member.userId,
    operation: ACCESS_AUDIT_OPERATIONS.membershipRevoked,
    before: {
      role: profile.role as Role,
      storeIds: profile.storeIds,
      permissions: profile.permissions,
    },
    after: {
      role: next.role,
      storeIds: next.storeIds,
      permissions: profile.permissions,
    },
  });
}

/**
 * Carry a roster edit through to the profile the guards actually read.
 *
 * `toggleActive` and `remove` both call `revokeProfileAccess`; `update` called
 * nothing, so the one mutation an owner uses day to day — the "Modifier le
 * membre" dialog — wrote to `teamMembers` and stopped. Since every guard
 * resolves rights from `userProfiles`, unticking a module, demoting a manager
 * or moving someone to another restaurant changed the team screen and left the
 * person's actual access exactly as it was.
 *
 * Called AFTER the patch, so it reads the row as it now stands, and inside the
 * same mutation, so the profile, the roster and the audit entry land in one
 * transaction or none.
 */
async function propagateMembershipUpdate(
  ctx: Parameters<typeof getAuthUser>[0] & {
    db: { patch: (id: unknown, updates: unknown) => Promise<unknown> };
  },
  before: {
    _id: Id<"teamMembers">;
    userId?: string;
    storeId?: string;
    allStores: boolean;
  }
) {
  // A pending invitation has no profile behind it yet, and `acceptInvitation`
  // reads the row as it stands when the invitee clicks — so editing one before
  // it is accepted already works, and there is nothing here to carry.
  const userId = before.userId;
  if (!userId) return;

  const after = await ctx.db.get(before._id);
  if (!after) return;

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: { eq: (f: string, v: unknown) => unknown }) =>
      q.eq("userId", userId)
    )
    .first();
  if (!profile) return;

  // The person's other positions. Without them, narrowing someone in one
  // restaurant would silently demote them in another.
  const rows: MembershipRow[] = await ctx.db
    .query("teamMembers")
    .withIndex("by_userId", (q: { eq: (f: string, v: unknown) => unknown }) =>
      q.eq("userId", userId)
    )
    .collect();

  const next = membershipUpdateEffect({
    profile: {
      role: profile.role as Role,
      storeIds: profile.storeIds,
      permissions: profile.permissions,
    },
    before: { storeId: before.storeId, allStores: before.allStores },
    after: projectMembership(after),
    others: rows
      .filter((row: MembershipRow) => row._id !== after._id)
      .map(projectMembership),
  });

  // `null` means the roster has no say over this profile, or nothing moved.
  if (!next) return;

  await ctx.db.patch(profile._id, {
    role: next.role,
    storeIds: next.storeIds,
    permissions: next.permissions,
    updatedAt: Date.now(),
  });

  await recordAccessAudit(ctx, {
    targetUserId: userId,
    operation: ACCESS_AUDIT_OPERATIONS.membershipUpdated,
    before: {
      role: profile.role as Role,
      storeIds: profile.storeIds,
      permissions: profile.permissions,
    },
    after: next,
  });
}

/** The roster fields the profile projection depends on. */
type MembershipRow = {
  _id: Id<"teamMembers">;
  role: "manager" | "kitchen" | "waiter" | "delivery";
  storeId?: Id<"stores">;
  allStores: boolean;
  permissions: string[];
  isActive: boolean;
};

function projectMembership(row: MembershipRow): MembershipProjection {
  return {
    role: row.role,
    storeId: row.storeId,
    allStores: row.allStores,
    permissions: row.permissions,
    isActive: row.isActive,
  };
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

/**
 * What `/invite/[token]` needs, and nothing else.
 *
 * It replaces `getByInvitationToken`, which was exported as a public query and
 * returned the WHOLE `teamMembers` row to an unauthenticated caller — the
 * module permission list, the userId, the token echoed back — while having no
 * caller anywhere outside Convex. Removed rather than left: an unused public
 * query is surface with nobody watching it.
 *
 * The page needs four fields and the restaurant's NAME, which is not on the row
 * at all: the invitation email had it because the inviter passed it in, and the
 * link carried nothing.
 *
 * It also answers instead of throwing. A page that has to distinguish "no such
 * invitation" from "expired" from "already accepted" cannot do it from an
 * exception Convex has redacted, and rendering three different pieces of copy
 * is the entire point of this route.
 */
// @public-by-design: the single-use token is the credential; the invitee has no
// session yet, and half the reason to visit is to find out they need one.
export const getInvitationPreview = query({
  args: { token: v.string() },
  // An explicit return validator, not inference. Convex widens a handler that
  // returns differently shaped objects, and the page depends on the narrowing:
  // it must be able to prove that a `pending` answer carries the store and the
  // role. It also pins what leaves the deployment for an anonymous caller.
  returns: v.union(
    v.object({
      status: v.union(
        v.literal("not_found"),
        v.literal("invitation_expired"),
        v.literal("invitation_not_pending")
      ),
    }),
    v.object({
      status: v.literal("pending"),
      name: v.string(),
      email: v.string(),
      role: v.string(),
      allStores: v.boolean(),
      storeName: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_invitationToken", (q) =>
        q.eq("invitationToken", args.token)
      )
      .first();

    if (!member) return { status: "not_found" as const };

    // The same rule `acceptInvitation` enforces, asked rather than thrown, so
    // the page can say "expired" before the invitee fills anything in. A
    // pending row past its lifetime still reads `pending` in the table — it is
    // stamped `expired` on the acceptance attempt, not by a sweeper — so the
    // check has to run here too or a week-old invitation looks live.
    try {
      assertInvitationAcceptable({ member, now: Date.now() });
    } catch (error) {
      // Narrowed to the two refusals this check can actually produce.
      // `TeamRejectionReason` also covers the roster-management rejections,
      // and widening the return to those would leave the page unable to prove
      // that a "pending" answer carries the store and role fields at all.
      const reason: "invitation_expired" | "invitation_not_pending" =
        error instanceof TeamAccessError &&
        error.reason === "invitation_not_pending"
          ? "invitation_not_pending"
          : "invitation_expired";
      return { status: reason };
    }

    const store = member.storeId ? await ctx.db.get(member.storeId) : null;

    return {
      status: "pending" as const,
      name: member.name,
      email: member.email,
      role: member.role,
      allStores: member.allStores,
      storeName: store?.name ?? null,
    };
  },
});

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
      throw new ConvexError({
        code: "not_authenticated",
        message: "Connectez-vous pour accepter cette invitation.",
      });
    }

    const member = await ctx.db
      .query("teamMembers")
      .withIndex("by_invitationToken", (q) =>
        q.eq("invitationToken", args.token)
      )
      .first();

    if (!member) {
      throw new ConvexError({
        code: "not_found",
        message: "Invitation introuvable.",
      });
    }

    const now = Date.now();
    try {
      assertInvitationAcceptable({ member, now });
    } catch (error) {
      // No write here, deliberately.
      //
      // This block used to stamp `invitationStatus: "expired"` before throwing,
      // "so the roster stops showing it as pending". It never did: a Convex
      // mutation is a transaction, and the throw on the next line rolls the
      // patch back. A test finally asked for the row afterwards and found it
      // still `pending` — the comment described an intention, not a behaviour.
      //
      // Expiry is a rule about `invitedAt`, not a stored fact, so
      // `getInvitationPreview` applies it on read and the invitee is told the
      // truth whatever the column says.
      //
      // A `TeamAccessError` carries the one thing the invite page needs — WHICH
      // refusal this is — and Convex redacts a plain thrown message in
      // production, so it is re-thrown as data. "Expired" and "already
      // accepted" ask the invitee to do two different things.
      if (error instanceof TeamAccessError) {
        throw new ConvexError({ code: error.reason, message: error.message });
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

    // The module checkboxes finally cross the bridge. They were collected by
    // the invite dialog, written to `teamMembers.permissions`, and then dropped
    // here — acceptance kept whatever the profile already had, which for a new
    // member was nothing, i.e. unrestricted. `requireStorePermission` reads
    // this list now, so an unticked module is a refusal rather than decoration.
    const permissions = invitationModules(
      member.permissions,
      existingProfile?.permissions
    );

    const result = await profileDefs.upsert.handler(ctx, {
      userId: identity.subject,
      role: grant.role,
      storeIds: grant.storeIds,
      permissions,
    });

    await recordAccessAudit(ctx, {
      targetUserId: identity.subject,
      operation: ACCESS_AUDIT_OPERATIONS.invitationAccepted,
      before: existingProfile
        ? {
            role: existingProfile.role as Role,
            storeIds: existingProfile.storeIds,
            permissions: existingProfile.permissions,
          }
        : null,
      after: {
        role: grant.role,
        storeIds: grant.storeIds,
        permissions,
      },
    });

    return result;
  },
});

/**
 * Expire the invitations that have run out, and delete the ones long dead.
 *
 * Nothing ever swept this table. An invitation past its seven days could not be
 * ACCEPTED — `assertInvitationAcceptable` refuses it — but it kept its status
 * of `pending` and, more to the point, kept its TOKEN. So the roster showed
 * "En attente" forever, and every link ever sent stayed in the database as a
 * live-looking secret with nothing left to protect.
 *
 * Expiring clears the token, which is the half that matters. Purging removes
 * rows nobody ever accepted, thirty days later, so the table stops accumulating
 * the name and email of people who never joined.
 *
 * `internalMutation`, called from `crons.ts`: a scheduled sweep has no session,
 * so it must never reach a guarded function. See `tests/convex/scheduled-paths`.
 */
export const sweepInvitations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const members = await ctx.db.query("teamMembers").collect();

    let expired = 0;
    let purged = 0;

    for (const member of members) {
      const verdict = sweepInvitation(member, now);

      if (verdict === "expire") {
        await ctx.db.patch(member._id, {
          invitationStatus: "expired" as const,
          // The point of the whole sweep: a dead link stops resolving.
          invitationToken: undefined,
          updatedAt: now,
        });
        expired += 1;
      } else if (verdict === "purge") {
        await ctx.db.delete(member._id);
        purged += 1;
      }
    }

    if (expired > 0 || purged > 0) {
      console.log(
        `[teamMembers] invitation sweep: ${expired} expired, ${purged} purged`
      );
    }

    return { expired, purged };
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

    const result = await defs.update.handler(ctx, args);

    // The half that was missing. Editing the roster has to reach the profile,
    // or the owner restricts nothing — see `propagateMembershipUpdate`.
    await propagateMembershipUpdate(ctx, existing);

    return result;
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
