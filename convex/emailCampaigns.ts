import { query, mutation } from "./_generated/server"
import { emailCampaigns as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const listRecent = query(defs.listRecent)
export const listByStatus = query(defs.listByStatus)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const remove = mutation(defs.remove)
export const schedule = mutation(defs.schedule)
export const cancel = mutation(defs.cancel)
export const pause = mutation(defs.pause)
export const markSending = mutation(defs.markSending)
export const markSent = mutation(defs.markSent)
