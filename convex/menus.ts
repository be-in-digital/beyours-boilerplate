import { query, mutation } from "./_generated/server"
import { menus as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const toggleStatus = mutation(defs.toggleStatus)
export const remove = mutation(defs.remove)
