export const dynamic = "force-dynamic"

const SITE_URL = process.env.CONVEX_SITE_URL!

async function proxy(request: Request) {
  const url = new URL(request.url)
  const target = `${SITE_URL}${url.pathname}${url.search}`

  try {
    let body: string | undefined
    if (request.method !== "GET") {
      const raw = await request.text()
      // Better Auth always expects JSON body, even empty. Default to "{}" to avoid
      // "Unexpected end of JSON input" errors on endpoints like sign-out that may
      // be called with no payload.
      body = raw || "{}"
    }
    const cookie = request.headers.get("cookie") || ""

    const origin = request.headers.get("origin") || process.env.BETTER_AUTH_URL || "http://localhost:3000"

    const headers: Record<string, string> = {
      "content-type": request.headers.get("content-type") || "application/json",
      "accept": "application/json",
      "origin": origin,
    }
    if (cookie) headers["cookie"] = cookie

    const res = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    })

    // Rebuild response to preserve set-cookie headers from Convex
    const resBody = await res.text()
    const responseHeaders = new Headers()
    res.headers.forEach((v, k) => {
      if (k !== "content-encoding" && k !== "transfer-encoding" && k !== "content-length") {
        responseHeaders.append(k, v)
      }
    })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      responseHeaders.append("set-cookie", c)
    }

    if (res.status >= 500) {
      console.error(`[auth-proxy] ${request.method} ${url.pathname} -> ${res.status}`, {
        target,
        hasCookie: !!cookie,
        body: resBody.substring(0, 300),
      })
    }

    return new Response(resBody, {
      status: res.status,
      headers: responseHeaders,
    })
  } catch (err) {
    console.error(`[auth-proxy] ${request.method} ${url.pathname} threw:`, err)
    return new Response(JSON.stringify({ error: "proxy_error", message: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }
}

export const GET = proxy
export const POST = proxy
