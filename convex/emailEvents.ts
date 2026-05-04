import { query, mutation } from "./_generated/server"
import { emailEvents as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const listByCampaign = query(defs.listByCampaign)
export const listBySubscriber = query(defs.listBySubscriber)

// === Mutations ===

export const create = mutation(defs.create)
export const createBatch = mutation(defs.createBatch)
