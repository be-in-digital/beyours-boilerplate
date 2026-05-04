import { query, mutation } from "./_generated/server"
import { emailSegments as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const countMatchingSubscribers = query(defs.countMatchingSubscribers)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const remove = mutation(defs.remove)
export const duplicate = mutation(defs.duplicate)
export const refreshCount = mutation(defs.refreshCount)
