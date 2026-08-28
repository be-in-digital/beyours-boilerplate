import { describe, it, expect } from "vitest"
import {
  buildFileResponseHeaders,
  isInlineSafeContentType,
} from "../file-serving"

const headersFor = (contentType: string | undefined) =>
  buildFileResponseHeaders({ contentType, contentLength: 42 })

describe("isInlineSafeContentType", () => {
  it.each([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
  ])("treats %s as inert", (contentType) => {
    expect(isInlineSafeContentType(contentType)).toBe(true)
  })

  it("ignores a charset parameter", () => {
    expect(isInlineSafeContentType("image/png; charset=binary")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(isInlineSafeContentType("IMAGE/PNG")).toBe(true)
  })

  it.each([
    "image/svg+xml",
    "application/pdf",
    "text/html",
    "application/octet-stream",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ])("does not treat %s as inert", (contentType) => {
    expect(isInlineSafeContentType(contentType)).toBe(false)
  })

  it("does not treat a missing type as inert", () => {
    expect(isInlineSafeContentType(undefined)).toBe(false)
  })
})

describe("buildFileResponseHeaders", () => {
  it("serves a photo inline, unchanged", () => {
    const headers = headersFor("image/jpeg")
    expect(headers["Content-Type"]).toBe("image/jpeg")
    expect(headers["Content-Disposition"]).toBe("inline")
  })

  /**
   * The report's payload: an SVG uploaded to the bucket, its URL sent to the
   * restaurant owner. Opening it must not open a document.
   */
  it("serves an SVG as an attachment", () => {
    expect(headersFor("image/svg+xml")["Content-Disposition"]).toBe("attachment")
  })

  it("keeps image/svg+xml as the type, so <img> can still draw a logo", () => {
    // Content-Disposition governs navigations, not subresource loads, and an
    // SVG in <img> cannot script. Forcing octet-stream here would break every
    // SVG logo instead.
    expect(headersFor("image/svg+xml")["Content-Type"]).toBe("image/svg+xml")
  })

  it.each([
    "application/pdf",
    "text/html",
    "application/xhtml+xml",
    "image/svg+xml",
  ])("attaches %s rather than rendering it", (contentType) => {
    expect(headersFor(contentType)["Content-Disposition"]).toBe("attachment")
  })

  it("falls back to octet-stream when S3 reports no type", () => {
    const headers = headersFor(undefined)
    expect(headers["Content-Type"]).toBe("application/octet-stream")
    expect(headers["Content-Disposition"]).toBe("attachment")
  })

  it("sends every response with nosniff", () => {
    // Without it, a browser may sniff `<svg …>` bytes back into a document
    // whatever the declared type says.
    for (const type of ["image/png", "image/svg+xml", undefined]) {
      expect(headersFor(type)["X-Content-Type-Options"]).toBe("nosniff")
    }
  })

  it("sends every response with a policy that cannot script or fetch", () => {
    for (const type of ["image/png", "image/svg+xml", "application/pdf"]) {
      const csp = headersFor(type)["Content-Security-Policy"]
      expect(csp).toContain("default-src 'none'")
      // sandbox with no allow-tokens: opaque origin, scripting disabled.
      expect(csp).toContain("sandbox")
      expect(csp).not.toContain("allow-scripts")
      expect(csp).not.toContain("allow-same-origin")
    }
  })

  it("keeps the immutable cache policy the route already had", () => {
    expect(headersFor("image/png")["Cache-Control"]).toBe(
      "public, max-age=31536000, immutable",
    )
  })

  it("reports the byte length it was given", () => {
    expect(
      buildFileResponseHeaders({ contentType: "image/png", contentLength: 1234 })[
        "Content-Length"
      ],
    ).toBe("1234")
  })
})
