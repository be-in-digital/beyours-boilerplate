import { query, mutation } from "./_generated/server"
import { promotions as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const getByCouponCode = query(defs.getByCouponCode)
export const listActiveAuto = query(defs.listActiveAuto)
export const getCustomerUsageCount = query(defs.getCustomerUsageCount)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const toggleStatus = mutation(defs.toggleStatus)
export const remove = mutation(defs.remove)
export const incrementUsage = mutation(defs.incrementUsage)
