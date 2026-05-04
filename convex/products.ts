import { query, mutation } from "./_generated/server"
import { products as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const list = query(defs.list)
export const getById = query(defs.getById)
export const getByCategory = query(defs.getByCategory)
export const getBySlug = query(defs.getBySlug)
export const getManyByIds = query(defs.getManyByIds)
export const getFeatured = query(defs.getFeatured)
export const getManualTrending = query(defs.getManualTrending)
export const getTrending = query(defs.getTrending)

// === Mutations ===

export const create = mutation(defs.create)
export const update = mutation(defs.update)
export const updateStock = mutation(defs.updateStock)
export const toggleStockTracking = mutation(defs.toggleStockTracking)
export const updateAutoDisable = mutation(defs.updateAutoDisable)
export const updateLowStockThreshold = mutation(defs.updateLowStockThreshold)
export const toggleStatus = mutation(defs.toggleStatus)
export const remove = mutation(defs.remove)
export const duplicateCatalog = mutation(defs.duplicateCatalog)
export const setTrendingProducts = mutation(defs.setTrendingProducts)
export const updateWithPropagation = mutation(defs.updateWithPropagation)
