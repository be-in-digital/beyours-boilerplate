import { createEmailRouteHandler } from "@be-in-digital/core"

const { POST } = createEmailRouteHandler({
  secret: process.env.BETTER_AUTH_SECRET!,
})

export { POST }
