import { query, mutation } from "./_generated/server"
import { orders as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const getByCustomer = query(defs.getByCustomer)
export const getByStatus = query(defs.getByStatus)
export const getByViewToken = query(defs.getByViewToken)

// === Mutations ===

export const create = mutation(defs.create)
export const updateStatus = mutation(defs.updateStatus)
export const remove = mutation(defs.remove)
export const createFromWebhook = mutation(defs.createFromWebhook)
export const updateFromWebhook = mutation(defs.updateFromWebhook)
