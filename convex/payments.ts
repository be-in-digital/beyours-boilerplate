import { query, mutation } from "./_generated/server"
import { payments as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const getByOrder = query(defs.getByOrder)
export const getByStore = query(defs.getByStore)

// === Mutations ===

export const create = mutation(defs.create)
export const updateStatus = mutation(defs.updateStatus)
export const refund = mutation(defs.refund)
