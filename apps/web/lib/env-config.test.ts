import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { envConfig, checkEnvVars } from "./env-config"

describe("env-config", () => {
  describe("envConfig schema", () => {
    it("declares NEXT_PUBLIC_CONVEX_URL as required and public", () => {
      const entry = envConfig.find((e) => e.name === "NEXT_PUBLIC_CONVEX_URL")
      expect(entry).toBeDefined()
      expect(entry?.required).toBe(true)
      expect(entry?.isPublic).toBe(true)
    })

    it("declares BETTER_AUTH_SECRET as required and not public", () => {
      const entry = envConfig.find((e) => e.name === "BETTER_AUTH_SECRET")
      expect(entry).toBeDefined()
      expect(entry?.required).toBe(true)
      expect(entry?.isPublic).toBeFalsy()
    })

    it("has a description for every entry", () => {
      for (const entry of envConfig) {
        expect(entry.description, `${entry.name} should have description`)
          .toBeTruthy()
      }
    })

    it("has unique names", () => {
      const names = envConfig.map((e) => e.name)
      expect(new Set(names).size).toBe(names.length)
    })
  })

  describe("checkEnvVars", () => {
    const originalEnv = { ...process.env }

    beforeEach(() => {
      for (const entry of envConfig) {
        delete process.env[entry.name]
      }
    })

    afterEach(() => {
      process.env = { ...originalEnv }
    })

    it("returns all entries when no env var is set", () => {
      const missing = checkEnvVars()
      expect(missing.length).toBe(envConfig.length)
      expect(missing.every((m) => "name" in m && "group" in m)).toBe(true)
    })

    it("excludes entries when their env var is set to a non-empty value", () => {
      process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud"
      const missing = checkEnvVars()
      expect(
        missing.find((m) => m.name === "NEXT_PUBLIC_CONVEX_URL"),
      ).toBeUndefined()
    })

    it("treats whitespace-only values as missing", () => {
      process.env.NEXT_PUBLIC_CONVEX_URL = "   "
      const missing = checkEnvVars()
      expect(
        missing.find((m) => m.name === "NEXT_PUBLIC_CONVEX_URL"),
      ).toBeDefined()
    })

    it("preserves the required flag in the missing list", () => {
      const missing = checkEnvVars()
      const entry = missing.find((m) => m.name === "BETTER_AUTH_SECRET")
      expect(entry?.required).toBe(true)
    })
  })
})
