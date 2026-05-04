import { components } from "./_generated/api"
import { internalMutation } from "./_generated/server"

export const clearJwks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null
    let total = 0
    do {
      const page = (await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: { model: "jwks" as never },
          paginationOpts: { numItems: 100, cursor },
        } as never,
      )) as { isDone: boolean; continueCursor: string }
      total += 1
      cursor = page.isDone ? null : page.continueCursor
    } while (cursor)
    return { deleted_pages: total }
  },
})
