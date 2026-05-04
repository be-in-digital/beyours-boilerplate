import { query, mutation } from "./_generated/server"
import { stores as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const getBySlug = query(defs.getBySlug)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const updateHours = mutation(defs.updateHours)
export const updateOverrides = mutation(defs.updateOverrides)
export const updateAddress = mutation(defs.updateAddress)
export const updatePrintConfig = mutation(defs.updatePrintConfig)
export const updateDisplayConfig = mutation(defs.updateDisplayConfig)
export const updateSoundConfig = mutation(defs.updateSoundConfig)
export const updateOrderConfirmation = mutation(defs.updateOrderConfirmation)
export const updateOrderMode = mutation(defs.updateOrderMode)
export const updateTrendingMode = mutation(defs.updateTrendingMode)
export const remove = mutation(defs.remove)
