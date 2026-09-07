/**
 * How a proxied S3 object is allowed to reach a browser.
 *
 * `GET /api/files/:key` used to reflect the object's stored `ContentType`
 * straight back with nothing else. An SVG therefore arrived as
 * `image/svg+xml` on the application's own origin, and opening its URL made it
 * a document: its `<script>` ran with the viewer's session, same-origin with
 * `/dashboard`. Sending the link to a restaurant owner was the whole attack.
 *
 * Two rules, applied to every response:
 *
 *  - **Only inert types render inline.** Raster images and video cannot
 *    execute. Everything else — SVG, PDF, Office documents, anything unknown —
 *    is served `Content-Disposition: attachment`, so following the link
 *    downloads a file instead of opening a document. `<img src="…logo.svg">`
 *    still draws: browsers apply `Content-Disposition` to navigations, not to
 *    subresource loads, and an SVG loaded through `<img>` cannot script anyway.
 *
 *  - **The response carries its own CSP.** A document made from this response
 *    gets `default-src 'none'; sandbox`, so even a browser that navigates to it
 *    runs nothing and reaches nowhere. This is the backstop that does not
 *    depend on the upload path having sanitized anything, and it is why the
 *    fix holds for the objects already sitting in the bucket.
 *
 * Pure function, so the rules are testable without S3.
 */

/**
 * Types that draw without executing. Deliberately a short list of raster
 * formats and video: it is an allow-list, so a type nobody thought about is
 * downloaded rather than rendered.
 *
 * `image/svg+xml` is absent on purpose. SVG is XML with a scripting model.
 */
const INLINE_SAFE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
])

/**
 * `default-src 'none'` stops every fetch, script, style and frame the document
 * might attempt; `sandbox` with no allow-tokens puts it in an opaque origin
 * with scripting disabled, so it cannot read the session it was opened with.
 */
const INERT_DOCUMENT_CSP = "default-src 'none'; sandbox"

const FALLBACK_CONTENT_TYPE = "application/octet-stream"

export function isInlineSafeContentType(contentType: string | undefined): boolean {
  if (!contentType) return false
  // Strip any `; charset=…` the object was stored with.
  const essence = contentType.split(";")[0]?.trim().toLowerCase() ?? ""
  return INLINE_SAFE_CONTENT_TYPES.has(essence)
}

/**
 * The headers `/api/files/:key` answers with.
 *
 * `contentLength` is passed in rather than derived so the caller stays the only
 * thing that touches the S3 body.
 */
export function buildFileResponseHeaders(input: {
  contentType: string | undefined
  contentLength: number
  /**
   * True for the folders that needed a session to be read at all (#188).
   *
   * The gate is undone by the cache directive if this is missed: `public`
   * invites any shared cache — a CDN, a corporate proxy — to keep the bytes and
   * hand them to the next caller, who has no session. `private, no-store` is
   * the one honest answer for a response whose audience is one account.
   *
   * A private object therefore loses the year-long cache. That is the cost of
   * the gate, and it is small: these are avatars, one per page.
   */
  isPrivate?: boolean
}): Record<string, string> {
  const inlineSafe = isInlineSafeContentType(input.contentType)

  return {
    // An unknown type is never guessed at: it is served as bytes.
    "Content-Type": inlineSafe
      ? (input.contentType as string)
      : (input.contentType ?? FALLBACK_CONTENT_TYPE),
    "Content-Disposition": inlineSafe ? "inline" : "attachment",
    // Without this, a browser may sniff `<svg …>` bytes back into an active
    // document whatever the declared type says.
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": INERT_DOCUMENT_CSP,
    "Cache-Control": input.isPrivate
      ? "private, no-store"
      : "public, max-age=31536000, immutable",
    "Content-Length": String(input.contentLength),
  }
}
