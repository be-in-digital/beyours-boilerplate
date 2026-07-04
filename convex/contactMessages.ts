import { query, mutation } from "./_generated/server"
import * as defs from "@be-in-digital/convex-functions/contactMessages"
import { requireStoreAccess } from "@be-in-digital/convex-functions/auth"

// === Queries (admin, auth-protected) ===

export const list = query({
  args: defs.list.args,
  handler: async (ctx, args) => {
    await requireStoreAccess(ctx, args.storeId)
    return defs.list.handler(ctx, args)
  },
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
export const updateStatus = mutation({
  args: defs.updateStatus.args,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")
    // Verify store ownership before allowing status update
    const message = await ctx.db.get(args.id)
    if (!message) throw new Error("Message not found")
    await requireStoreAccess(ctx, message.storeId)
    return defs.updateStatus.handler(ctx, args)
  },
})
