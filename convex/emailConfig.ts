import { query, mutation } from "./_generated/server"
import { emailConfig as defs } from "@be-in-digital/convex-functions"

// === Queries ===

export const get = query(defs.get)

// === Mutations ===

export const upsert = mutation(defs.upsert)
