import { query, mutation } from "./_generated/server"
import { teamMembers as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getByUser = query(defs.getByUser)
export const getByRole = query(defs.getByRole)
export const getByEmail = query(defs.getByEmail)
export const getByInvitationToken = query(defs.getByInvitationToken)

// === Mutations ===

export const invite = mutation(defs.invite)
export const acceptInvitation = mutation(defs.acceptInvitation)
export const resendInvitation = mutation(defs.resendInvitation)
export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const toggleActive = mutation(defs.toggleActive)
export const remove = mutation(defs.remove)
