import { query, mutation } from "./_generated/server"
import { contactMessages as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)

// === Mutations ===

export const create = mutation(defs.create)
export const updateStatus = mutation(defs.updateStatus)
