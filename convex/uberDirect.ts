"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// OAuth token cache (module-level, persists across invocations in same worker)
// ---------------------------------------------------------------------------

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();
const TOKEN_BUFFER_MS = 60_000; // Expire 60 s early to avoid using a near-expired token

async function getOAuthToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const cacheKey = clientId;
  const cached = tokenCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  const response = await fetch("https://login.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "eats.deliveries",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Uber OAuth failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000 - TOKEN_BUFFER_MS;
  tokenCache.set(cacheKey, { accessToken: data.access_token, expiresAt });

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Response shape returned by Uber Direct estimates endpoint
// ---------------------------------------------------------------------------

interface UberEstimateResponse {
  estimate_id: string;
  estimated_at: number;
  expires_at: number;
  estimates: Array<{
    pickup_at: number;
    delivery_fee: {
      total: number;
      currency_code: string;
      line_items: Array<{
        fee_code: string;
        value: number;
        category: string;
      }>;
    };
    etd: number;
  }>;
}

function parseEstimateResponse(data: UberEstimateResponse) {
  const estimate = data.estimates?.[0];
  if (!estimate) {
    throw new Error("UBER_API_ERROR: No estimates returned");
  }

  // Fee is already in minor currency units (cents)
  const fee = estimate.delivery_fee.total;
  const currency = estimate.delivery_fee.currency_code;

  // Convert absolute ETD timestamp to relative minutes from now
  const now = Date.now();
  const estimatedDeliveryMinutes = Math.round((estimate.etd - now) / 60_000);

  return {
    estimateId: data.estimate_id,
    fee, // cents
    currency,
    expiresAt: data.expires_at,
    estimatedDeliveryMinutes: Math.max(estimatedDeliveryMinutes, 5), // minimum 5 min
  };
}

// ---------------------------------------------------------------------------
// Shared helper: call the estimates endpoint and handle common HTTP errors
// ---------------------------------------------------------------------------

async function callEstimatesEndpoint(
  token: string,
  body: object
): Promise<Response> {
  return fetch("https://api.uber.com/v1/eats/deliveries/estimates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Action: getDeliveryQuote
// ---------------------------------------------------------------------------

/**
 * Get a delivery quote from Uber Direct.
 * Returns the estimated fee and delivery time for a given dropoff location.
 */
export const getDeliveryQuote = action({
  args: {
    storeId: v.id("stores"),
    dropoffLatitude: v.number(),
    dropoffLongitude: v.number(),
    dropoffAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Fetch store to verify pickup coordinates exist
    // Note: defs.getById uses the arg key "id", so we map storeId → id here
    const store = await ctx.runQuery(api.stores.getById, { id: args.storeId });
    if (!store) {
      throw new Error("STORE_NOT_FOUND");
    }
    if (!store.address?.latitude || !store.address?.longitude) {
      throw new Error(
        "STORE_ADDRESS_INCOMPLETE: Store has no coordinates configured"
      );
    }

    // 2. Fetch global settings for Uber Direct credentials
    const settings = await ctx.runQuery(internal.globalSettings.getInternal, {});
    if (!settings) {
      throw new Error("SETTINGS_NOT_FOUND");
    }

    const uberConfig = settings.integrations?.uberDirect;
    if (!uberConfig?.enabled) {
      throw new Error("UBER_DIRECT_DISABLED");
    }
    if (!uberConfig.clientId || !uberConfig.clientSecret) {
      throw new Error(
        "UBER_DIRECT_NOT_CONFIGURED: Missing clientId or clientSecret"
      );
    }
    if (!uberConfig.customerId) {
      throw new Error(
        "UBER_DIRECT_NOT_CONFIGURED: Missing customerId (Uber store ID)"
      );
    }

    // 3. Obtain OAuth token (served from module-level cache when still valid)
    let token: string;
    try {
      token = await getOAuthToken(uberConfig.clientId, uberConfig.clientSecret);
    } catch (err) {
      throw new Error(
        `UBER_AUTH_FAILED: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }

    // 4. Build estimates request body
    // customerId IS the Uber store ID used as the pickup reference
    const estimateBody = {
      pickup: {
        store_id: uberConfig.customerId,
      },
      dropoff: {
        location: {
          latitude: args.dropoffLatitude,
          longitude: args.dropoffLongitude,
        },
      },
      pickup_times: [0], // 0 = ASAP
    };

    // 5. Call Uber Direct estimates endpoint
    let estimateResponse = await callEstimatesEndpoint(token, estimateBody);

    // On 401, the cached token may have been revoked — evict and retry once
    if (estimateResponse.status === 401) {
      tokenCache.delete(uberConfig.clientId);
      const freshToken = await getOAuthToken(
        uberConfig.clientId,
        uberConfig.clientSecret
      );
      estimateResponse = await callEstimatesEndpoint(freshToken, estimateBody);
    }

    // Handle well-known Uber Direct error codes with clear messages
    if (estimateResponse.status === 422) {
      throw new Error(
        "UNDELIVERABLE_ZONE: Uber Direct cannot deliver to this location"
      );
    }

    if (estimateResponse.status === 429) {
      throw new Error(
        "RATE_LIMITED: Uber Direct API rate limit exceeded. Please try again later."
      );
    }

    if (!estimateResponse.ok) {
      const text = await estimateResponse.text();
      throw new Error(`UBER_API_ERROR (${estimateResponse.status}): ${text}`);
    }

    return parseEstimateResponse(
      (await estimateResponse.json()) as UberEstimateResponse
    );
  },
});
