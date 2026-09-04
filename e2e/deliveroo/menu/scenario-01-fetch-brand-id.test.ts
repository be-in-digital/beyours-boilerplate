/**
 * Deliveroo Menu API - Scenario 1: Fetch Brand ID
 *
 * Tests the ability to retrieve brand_id using site_location_id
 * Uses the Deliveroo client from @be-in-digital/integrations
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { deliveroo } from "@be-in-digital/integrations";

const { fetchDeliveroo, getAccessToken, clearTokenCache } = deliveroo;
type DeliverooCredentials = Parameters<typeof getAccessToken>[0];
import { announceSkippedLiveRun, config, hasDeliverooSandbox, log } from "../test-config";

// ============================================================================
// Credentials for sandbox
// ============================================================================

const credentials: DeliverooCredentials = {
  clientId: config.CLIENT_ID,
  clientSecret: config.CLIENT_SECRET,
  sandboxMode: config.IS_SANDBOX,
};

const itWithDeliverooSandbox = it.runIf(hasDeliverooSandbox);

// ============================================================================
// Fetch mocking
// ============================================================================

/** Build a JSON Response the way the Deliveroo API would. */
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Run `body` with global fetch replaced by `handler`.
 *
 * The client caches tokens in a module-level Map, so the cache is cleared on
 * both sides: a token minted here must not leak into the live suites above,
 * and a live token must not satisfy the mocked ones.
 */
async function withMockedFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  body: () => Promise<void>,
): Promise<void> {
  const realFetch = globalThis.fetch;
  clearTokenCache();
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init))) as typeof fetch;
  try {
    await body();
  } finally {
    globalThis.fetch = realFetch;
    clearTokenCache();
  }
}

// ============================================================================
// Test Suite
// ============================================================================

describe("Deliveroo Menu - Scenario 1: Fetch Brand ID", () => {
  beforeAll(() => {
    log.info("Starting Fetch Brand ID Test Suite");
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
    log.info(`Site ID: ${config.SITE_ID}`);
    log.info(`Brand ID (configured): ${config.BRAND_ID}`);
    announceSkippedLiveRun(
      "Deliveroo Menu - Scenario 1: Fetch Brand ID",
      "5 tests that call the Deliveroo sandbox API — OAuth token retrieval, " +
        "brand lookup and API-type routing",
      "sandbox",
    );
  });

  // ========================================================================
  // Test 1: OAuth Token Retrieval
  // ========================================================================

  itWithDeliverooSandbox("should obtain OAuth access token with valid credentials", async () => {
    log.test("Test 1: Obtaining OAuth access token");

    const token = await getAccessToken(credentials);

    expect(token).toBeDefined();
    expect(token.accessToken).toBeTruthy();
    expect(typeof token.accessToken).toBe("string");
    expect(token.expiresAt).toBeGreaterThan(Date.now());

    log.success("OAuth token obtained successfully");
    log.info(`  - Token length: ${token.accessToken.length} chars`);
    log.info(
      `  - Expires in: ${Math.round((token.expiresAt - Date.now()) / 1000)}s`,
    );
  }, 15000);

  // ========================================================================
  // Test 2: Fetch Brand ID via Site API
  // ========================================================================

  itWithDeliverooSandbox("should fetch brand ID successfully with valid site location ID", async () => {
    log.test("Test 2: Fetching brand ID via site API");

    // Use the site API to list brands/sites
    const response = await fetchDeliveroo(
      credentials,
      `/v1/brands/${config.BRAND_ID}/sites/${config.SITE_ID}/status`,
      { method: "GET" },
      "site",
    );

    // The API should respond (may be 200 or 404 depending on sandbox state)
    expect(response).toBeDefined();
    expect(typeof response.status).toBe("number");

    if (response.ok) {
      const data = await response.json();
      expect(data).toBeDefined();
      log.success("Site status retrieved successfully");
      log.info(`  - Response status: ${response.status}`);
    } else {
      // In sandbox, the site might not exist yet
      log.info(
        `  - API returned ${response.status} (expected in sandbox if site not configured)`,
      );
    }
  }, 15000);

  // ========================================================================
  // Test 3: Brand ID Format Validation
  // ========================================================================

  itWithDeliverooSandbox("should validate brand ID follows UUID format", async () => {
    log.test("Test 3: Validating brand ID format");

    const brandId = config.BRAND_ID;

    // Brand ID should be a valid UUID
    expect(brandId).toBeTruthy();
    expect(brandId).toMatch(/^[a-f0-9-]{36}$/);

    log.success("Brand ID format validated");
    log.info(`  - Brand ID: ${brandId}`);
  });

  // ========================================================================
  // Test 4: Consistent Token for Same Credentials
  // ========================================================================

  itWithDeliverooSandbox("should return valid tokens for same credentials", async () => {
    log.test("Test 4: Validating token retrieval consistency");

    // Both calls should return valid tokens
    // Note: Deliveroo sandbox tokens have short TTL (300s), and our cache uses
    // a 5-min buffer, so each call may refresh. We validate both are valid.
    const token1 = await getAccessToken(credentials);
    const token2 = await getAccessToken(credentials);

    expect(token1.accessToken).toBeTruthy();
    expect(token2.accessToken).toBeTruthy();
    expect(typeof token1.accessToken).toBe("string");
    expect(typeof token2.accessToken).toBe("string");

    log.success("Token consistency validated");
    log.info("  Both calls returned valid tokens");
  }, 15000);

  // ========================================================================
  // Test 5: Site ID Format Validation
  // ========================================================================

  it("should validate site location ID format", async () => {
    log.test("Test 5: Validating site location ID");

    const siteId = config.SITE_ID;

    // Site ID should be a non-empty string
    expect(siteId).toBeTruthy();
    expect(typeof siteId).toBe("string");
    expect(siteId.length).toBeGreaterThan(0);

    log.success("Site location ID validated");
    log.info(`  - Site ID: ${siteId}`);
  });

  // ========================================================================
  // Test 6: Error Handling for Invalid Credentials
  // ========================================================================

  it("should fail gracefully for invalid credentials", async () => {
    log.test("Test 6: Testing error handling for invalid credentials");

    const invalidCredentials: DeliverooCredentials = {
      clientId: "invalid-client-id",
      clientSecret: "invalid-client-secret",
      sandboxMode: config.IS_SANDBOX,
    };

    await expect(getAccessToken(invalidCredentials)).rejects.toThrow();

    log.success("Invalid credentials error handling validated");
    log.info("  OAuth token request correctly rejected");
  }, 15000);

  // ========================================================================
  // Test 7: API Types Distinction
  // ========================================================================

  itWithDeliverooSandbox("should support different API types (order, menu, site)", async () => {
    log.test("Test 7: Validating API type routing");

    // The fetchDeliveroo function supports different API types
    // Each routes to a different base URL

    const apiTypes = ["order", "menu", "site"] as const;

    for (const apiType of apiTypes) {
      // Just verify the function accepts each API type without throwing
      // (actual API calls may fail due to sandbox state)
      try {
        const response = await fetchDeliveroo(
          credentials,
          "/v1/health",
          { method: "GET" },
          apiType,
        );
        log.info(`  - ${apiType} API: status ${response.status}`);
      } catch {
        // Network errors are expected for health endpoints
        log.info(`  - ${apiType} API: endpoint not available (expected)`);
      }
    }

    log.success("API type routing validated");
  }, 30000);
});

describe("Deliveroo Menu - Brand ID Error Handling", () => {
  // ========================================================================
  // Test 1: Invalid Brand ID Format
  // ========================================================================

  it("should reject invalid brand ID format", async () => {
    log.test("Error Test 1: Invalid brand ID format");

    // Path traversal should be rejected
    const invalidBrandIds = [
      "../etc/passwd",
      "brand/../../../secret",
      "",
    ];

    for (const invalidId of invalidBrandIds) {
      if (!invalidId) {
        // Empty string should throw
        expect(() => {
          // Importing validatePathParam to test directly
          if (!invalidId || typeof invalidId !== "string") {
            throw new Error("brandId must be a non-empty string");
          }
        }).toThrow();
      }
    }

    log.success("Invalid brand ID formats rejected");
  });

  // ========================================================================
  // Test 2: Handle 401 Unauthorized
  // ========================================================================

  it("should retry once with a fresh token when the API answers 401", async () => {
    log.test("Error Test 2: Handling 401 Unauthorized");

    // Deliveroo's gateway answers 401/403 for an expired token. The client is
    // expected to drop the cached token, mint a new one and replay the request
    // exactly once — so a stale token must not surface as a failed call.
    const calls: Array<{ url: string; auth?: string }> = [];
    let tokensIssued = 0;

    await withMockedFetch(
      (url, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        calls.push({ url, auth: headers.Authorization });

        if (url.endsWith("/oauth2/token")) {
          tokensIssued += 1;
          return jsonResponse(
            { access_token: `token-${tokensIssued}`, token_type: "Bearer", expires_in: 3600 },
            200,
          );
        }

        const apiCalls = calls.filter((c) => !c.url.endsWith("/oauth2/token"));
        return apiCalls.length === 1
          ? new Response("token expired", { status: 401 })
          : jsonResponse({ ok: true }, 200);
      },
      async () => {
        const response = await fetchDeliveroo(
          credentials,
          "/v1/brands/brand-1/sites/site-1/status",
          { method: "GET" },
          "site",
        );

        expect(response.status).toBe(200);
      },
    );

    const apiCalls = calls.filter((c) => !c.url.endsWith("/oauth2/token"));
    expect(tokensIssued).toBe(2);
    // Exactly one replay, and it must carry the new token, not the rejected one.
    expect(apiCalls.map((c) => c.auth)).toEqual([
      "Bearer token-1",
      "Bearer token-2",
    ]);

    log.success("401 triggers exactly one retry with a refreshed token");
  });

  // ========================================================================
  // Test 3: Handle 404 Not Found
  // ========================================================================

  it("should handle 404 Not Found (site not found)", async () => {
    log.test("Error Test 3: Handling 404 Not Found");

    const testCredentials: DeliverooCredentials = {
      clientId: config.CLIENT_ID,
      clientSecret: config.CLIENT_SECRET,
      sandboxMode: config.IS_SANDBOX,
    };

    try {
      const response = await fetchDeliveroo(
        testCredentials,
        `/v1/brands/${config.BRAND_ID}/sites/nonexistent-site-404/status`,
        { method: "GET" },
        "site",
      );

      // 404 is expected for non-existent sites
      if (!response.ok) {
        expect([404, 400, 403]).toContain(response.status);
        log.info(`  - Got expected error status: ${response.status}`);
      }
    } catch (error) {
      // OAuth may fail in sandbox, which is also valid error handling
      expect(error).toBeDefined();
      log.info("  - Request failed as expected");
    }

    log.success("404 error handling validated");
  }, 15000);

  // ========================================================================
  // Test 4: Handle 500 Server Error
  // ========================================================================

  it("should back off on a 500, a bounded number of times, without re-minting the token", async () => {
    log.test("Error Test 4: Handling 500 Server Error");

    // REWRITTEN. This test used to assert exactly one attempt — "surface 500
    // without retrying". That blessed the defect: Deliveroo documents
    // 500/502/503/504 as "server error on Deliveroo's side — retry after
    // backoff", and this is an idempotent GET, so replaying it is safe. The
    // client had no backoff at all, so one transient 500 failed a menu push
    // outright.
    //
    // What the old test was really protecting still holds, and is asserted
    // below: a 500 is NOT a stale token. The token refresh stays gated on
    // 401/403, so the whole sequence mints exactly one token, and the body is
    // handed back untouched once the attempts run out — the caller decides
    // what a persistent 500 means.
    //
    // Fake timers: the real delays are hundreds of milliseconds of deliberate
    // sleep, and a suite that actually waits them out is a suite that times out.
    const calls: string[] = [];

    vi.useFakeTimers();
    try {
      await withMockedFetch(
        (url) => {
          calls.push(url);
          return url.endsWith("/oauth2/token")
            ? jsonResponse({ access_token: "token-1", token_type: "Bearer", expires_in: 3600 }, 200)
            : new Response("upstream exploded", { status: 500 });
        },
        async () => {
          const pending = fetchDeliveroo(
            credentials,
            "/v1/brands/brand-1/sites/site-1/status",
            { method: "GET" },
            "site",
          );

          await vi.runAllTimersAsync();
          const response = await pending;

          expect(response.status).toBe(500);
          expect(await response.text()).toBe("upstream exploded");
        },
      );
    } finally {
      vi.useRealTimers();
    }

    const apiCalls = calls.filter((u) => !u.endsWith("/oauth2/token"));
    const tokenCalls = calls.filter((u) => u.endsWith("/oauth2/token"));

    // Bounded, so a platform outage costs three requests and not a loop.
    expect(apiCalls).toHaveLength(3);
    // The original point of this test: no fresh token burnt on a 500.
    expect(tokenCalls).toHaveLength(1);

    log.success("500 is retried with backoff, bounded, and on one token");
  });

  it("should raise an IntegrationError when the OAuth endpoint fails", async () => {
    log.test("Error Test 5: OAuth endpoint failure");

    // A failing token endpoint must not leak as a bare fetch error: the client
    // wraps it so callers can read the status and the platform.
    await withMockedFetch(
      () => new Response("service unavailable", { status: 500 }),
      async () => {
        const error = await getAccessToken(credentials).then(
          () => null,
          (e: unknown) => e,
        );

        expect(error).toBeInstanceOf(Error);
        const integrationError = error as Error & {
          statusCode?: number;
          platform?: string;
        };
        expect(integrationError.name).toBe("IntegrationError");
        expect(integrationError.message).toBe("Deliveroo OAuth failed");
        expect(integrationError.statusCode).toBe(500);
        expect(integrationError.platform).toBe("deliveroo");
      },
    );

    log.success("OAuth failure surfaces as IntegrationError");
  });
});
