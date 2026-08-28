import { createEmailRouteHandler } from "@be-in-digital/core"

// EMAIL_API_SECRET is the dedicated credential for this route; BETTER_AUTH_SECRET
// is a transitional fallback so deployments that predate the split keep sending.
// Whichever is used, convex/auth.ts must present the SAME one — they are two
// halves of one handshake, in two different runtimes.
//
// No `!` here on purpose: an absent secret must reach the handler's own guard,
// which refuses every request, rather than being asserted away.
const { POST } = createEmailRouteHandler({
  secret: process.env.EMAIL_API_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "",
  linkOrigin: process.env.SITE_URL,
})

export { POST }
