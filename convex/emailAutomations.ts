import { query, mutation } from "./_generated/server"
import { emailAutomations as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const listActive = query(defs.listActive)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const remove = mutation(defs.remove)
export const activate = mutation(defs.activate)
export const pause = mutation(defs.pause)
