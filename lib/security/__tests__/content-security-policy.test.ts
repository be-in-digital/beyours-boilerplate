import { describe, it, expect } from "vitest"
import { buildContentSecurityPolicy } from "../content-security-policy"

const parse = (policy: string): Record<string, string[]> =>
  Object.fromEntries(
    policy.split(";").map((part) => {
      const [directive, ...values] = part.trim().split(/\s+/)
      return [directive, values]
    }),
  )

const production = () => parse(buildContentSecurityPolicy({ isDevelopment: false }))
const development = () => parse(buildContentSecurityPolicy({ isDevelopment: true }))

describe("buildContentSecurityPolicy", () => {
  it.each([
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["frame-ancestors", "'none'"],
    ["form-action", "'self'"],
    ["default-src", "'self'"],
  ])("locks %s to %s in production", (directive, value) => {
    expect(production()[directive]).toEqual([value])
  })

  it("does not grant eval in production", () => {
    expect(production()["script-src"]).not.toContain("'unsafe-eval'")
  })

  it("grants eval and the HMR socket only in development", () => {
    expect(development()["script-src"]).toContain("'unsafe-eval'")
    expect(development()["connect-src"]).toContain("ws:")
    expect(production()["connect-src"]).not.toContain("ws:")
  })

  it("still allows the inline script Next.js hydrates from", () => {
    // Stated rather than assumed: this policy does not stop injected inline
    // script. Removing 'unsafe-inline' needs a per-request nonce, which needs
    // middleware, which opts every page out of static rendering.
    expect(production()["script-src"]).toContain("'unsafe-inline'")
  })

  it("leaves connect-src open to https/wss for the per-client Convex backend", () => {
    // headers() is evaluated at build time; the deployment URL is a runtime
    // value that differs per client.
    expect(production()["connect-src"]).toContain("https:")
    expect(production()["connect-src"]).toContain("wss:")
  })

  describe("a Convex backend on this machine", () => {
    // The e2e suite runs a production build against a local Convex backend, so
    // the socket it needs is ws://127.0.0.1 — which a production policy refuses.
    const withConvex = (convexUrl: string) =>
      parse(buildContentSecurityPolicy({ isDevelopment: false, convexUrl }))

    it("admits the loopback origin and its websocket", () => {
      const sources = withConvex("http://127.0.0.1:3310")["connect-src"]
      expect(sources).toContain("http://127.0.0.1:3310")
      expect(sources).toContain("ws://127.0.0.1:3310")
    })

    it("changes nothing for a real deployment", () => {
      expect(withConvex("https://sturdy-lion-42.convex.cloud")["connect-src"]).toEqual(
        production()["connect-src"],
      )
    })

    it("still refuses ws: wholesale", () => {
      // The specific origin is admitted; the scheme is not. A page on a client
      // deployment must not be free to open a socket to any host it likes.
      expect(withConvex("http://localhost:3310")["connect-src"]).not.toContain("ws:")
    })

    it("ignores a value that is not a URL", () => {
      expect(withConvex("not a url")["connect-src"]).toEqual(production()["connect-src"])
    })
  })

  it("emits one well-formed directive per entry", () => {
    const policy = buildContentSecurityPolicy({ isDevelopment: false })
    expect(policy).not.toContain(";;")
    expect(policy.trim().endsWith(";")).toBe(false)
    for (const part of policy.split(";")) {
      expect(part.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2)
    }
  })
})
