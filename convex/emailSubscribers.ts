import { query, mutation } from "./_generated/server"
import { emailSubscribers as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const getByEmail = query(defs.getByEmail)
export const countByStatus = query(defs.countByStatus)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const remove = mutation(defs.remove)
export const confirmDoubleOptIn = mutation(defs.confirmDoubleOptIn)
export const unsubscribe = mutation(defs.unsubscribe)
export const markBounced = mutation(defs.markBounced)
export const markComplained = mutation(defs.markComplained)
export const addTag = mutation(defs.addTag)
export const removeTag = mutation(defs.removeTag)
export const importBatch = mutation(defs.importBatch)
