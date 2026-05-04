export const dynamic = "force-dynamic"

const SITE_URL = process.env.CONVEX_SITE_URL!

async function proxy(request: Request) {
  const url = new URL(request.url)
  const target = `${SITE_URL}${url.pathname}${url.search}`

  const body = request.method !== "GET" ? await request.text() : undefined
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

  return new Response(resBody, {
    status: res.status,
    headers: responseHeaders,
  })
}

export const GET = proxy
export const POST = proxy
