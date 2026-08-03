import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import * as defs from "@be-in-digital/convex-functions/teamMembers";
import { storeQuery, authedQuery, authedMutation } from "./lib/storeFunctions";

// === QUERIES ===

export const list = storeQuery({
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
});

export const getByUser = authedQuery({
  args: defs.getByUser.args,
  handler: (ctx, args) => defs.getByUser.handler(ctx, args),
});

export const getByRole = storeQuery({
  args: defs.getByRole.args,
  handler: (ctx, args) => defs.getByRole.handler(ctx, args),
});

export const getByEmail = authedQuery({
  args: defs.getByEmail.args,
  handler: (ctx, args) => defs.getByEmail.handler(ctx, args),
});

export const getByInvitationToken = query(defs.getByInvitationToken);

// Internal query for actions to read member data
export const getById = internalQuery({
  args: { id: v.id("teamMembers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// === MUTATIONS ===

export const invite = authedMutation({
  args: defs.invite.args,
  handler: (ctx, args) => defs.invite.handler(ctx, args),
});

// Internal version of invite (called from sendInvitationEmail action)
export const inviteInternal = internalMutation({
  args: defs.invite.args,
  handler: async (ctx, args) => {
    return defs.invite.handler(ctx, args);
  },
});

export const acceptInvitation = mutation({
  args: defs.acceptInvitation.args,
  handler: async (ctx, args) => {
    return defs.acceptInvitation.handler(ctx, args);
  },
});

export const resendInvitation = authedMutation({
  args: defs.resendInvitation.args,
  handler: (ctx, args) => defs.resendInvitation.handler(ctx, args),
});

// Internal version (called from resendInvitationEmail action)
export const resendInvitationInternal = internalMutation({
  args: defs.resendInvitation.args,
  handler: async (ctx, args) => {
    return defs.resendInvitation.handler(ctx, args);
  },
});

export const create = authedMutation({
  args: defs.create.args,
  handler: (ctx, args) => defs.create.handler(ctx, args),
});

export const update = authedMutation({
  args: defs.update.args,
  handler: (ctx, args) => defs.update.handler(ctx, args),
});

export const toggleActive = authedMutation({
  args: defs.toggleActive.args,
  handler: (ctx, args) => defs.toggleActive.handler(ctx, args),
});

export const remove = authedMutation({
  args: defs.remove.args,
  handler: (ctx, args) => defs.remove.handler(ctx, args),
});
