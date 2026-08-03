import { mutation } from "./_generated/server"
import * as defs from "@be-in-digital/convex-functions/contactMessages"
import { storeQuery, storeMutation, storeIdFromDocument } from "./lib/storeFunctions"

// === Queries (admin, auth-protected) ===

export const list = storeQuery({
  args: defs.list.args,
  handler: (ctx, args) => defs.list.handler(ctx, args),
})

// === Mutations ===

/**
 * Public mutation — allows unauthenticated storefront visitors to submit a contact message.
 */
export const create = mutation({
  args: defs.create.args,
  handler: async (ctx, args) => {
    return defs.create.handler(ctx, args)
  },
})

/**
 * Admin mutation — update message status (read, archived).
 */
export const updateStatus = storeMutation({
  args: defs.updateStatus.args,
  storeIdFrom: storeIdFromDocument("Message not found"),
  handler: (ctx, args) => defs.updateStatus.handler(ctx, args),
})
