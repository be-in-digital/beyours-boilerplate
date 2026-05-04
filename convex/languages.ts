import { query, mutation } from "./_generated/server"
import { languages as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const listActive = query(defs.listActive)
export const listAll = query(defs.listAll)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const toggleActive = mutation(defs.toggleActive)
export const setDefault = mutation(defs.setDefault)
export const remove = mutation(defs.remove)
