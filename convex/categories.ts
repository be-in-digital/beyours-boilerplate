import { query, mutation } from "./_generated/server"
import { categories as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const listActiveWithCounts = query(defs.listActiveWithCounts)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const reorder = mutation(defs.reorder)
export const remove = mutation(defs.remove)
