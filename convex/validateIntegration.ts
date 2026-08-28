"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getPackageEnv, getSiteEnv } from "@be-in-digital/core/env";

// Input validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_ID_REGEX = /^\d{1,20}$/;

/**
 * Sanitize API error messages before returning to frontend.
 * Strips raw API responses that may contain infrastructure details.
 */
function sanitizeApiError(status: number, context: string): string {
  switch (status) {
    case 400:
      return `${context} : requete invalide. Verifiez l'identifiant.`;
    case 401:
      return `${context} : credentials invalides.`;
    case 403:
      return `${context} : acces refuse. Verifiez que vos credentials ont acces a cette ressource.`;
    case 404:
      return `${context} : ressource introuvable. Verifiez l'identifiant.`;
    default:
      return `${context} : erreur de validation (${status}). Veuillez reessayer.`;
  }
}

/**
 * Validate integration credentials before saving.
 *
 * Calls the platform API to verify that the credentials (from env vars)
 * and the provided store/brand IDs are valid.
 *
 * - Uber Eats: calls getStoreStatus(credentials, storeId)
 * - Deliveroo: calls getAccessToken(credentials) then fetches /v1/brands/{brandId}/menus
 */
// @guarded-inline: checks settings:read by role — no store to scope against
export const validate = action({
  args: {
    platform: v.union(v.literal("uberEats"), v.literal("deliveroo"), v.literal("uberDirect")),
    platformStoreId: v.optional(v.string()),
    brandId: v.optional(v.string()),
    // Uber Direct credentials (stored in globalSettings, not env vars)
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    customerId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ valid: boolean; error?: string }> => {
    // C-01: Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {

    // Deployment-wide operation with no store to scope against. "Logged in"
    // included every customer account, so the check is by role.
    await ctx.runQuery(internal.authHelpers.checkPermission, {
      permission: "settings:read",
    });
      return { valid: false, error: "Non authentifie" };
    }

    // -----------------------------------------------------------------------
    // Uber Direct: validate OAuth credentials by requesting a token
    // -----------------------------------------------------------------------
    if (args.platform === "uberDirect") {
      if (!args.clientId || !args.clientSecret) {
        return {
          valid: false,
          error: "Le Client ID et le Client Secret sont requis pour Uber Direct.",
        };
      }

      if (!args.customerId) {
        return {
          valid: false,
          error: "Le Customer ID (Uber Store ID) est requis pour Uber Direct.",
        };
      }

      try {
        // Step 1: Validate credentials by requesting an OAuth token
        const tokenResponse = await fetch("https://login.uber.com/oauth/v2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: args.clientId,
            client_secret: args.clientSecret,
            scope: "eats.deliveries",
          }),
        });

        if (!tokenResponse.ok) {
          const status = tokenResponse.status;
          console.error(`[validateIntegration] Uber Direct OAuth failed (${status})`);
          if (status === 401 || status === 403) {
            return {
              valid: false,
              error: "Credentials Uber Direct invalides. Verifiez votre Client ID et Client Secret.",
            };
          }
          return {
            valid: false,
            error: sanitizeApiError(status, "Uber Direct OAuth"),
          };
        }

        return { valid: true };
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        console.error(`[validateIntegration] Uber Direct error:`, raw);
        return {
          valid: false,
          error: "Echec de la validation Uber Direct. Veuillez reessayer.",
        };
      }
    }

    // -----------------------------------------------------------------------
    // Uber Eats
    // -----------------------------------------------------------------------
    if (args.platform === "uberEats") {
      if (!args.platformStoreId) {
        return { valid: false, error: "Le Store ID Uber Eats est requis." };
      }
      // C-02: Input validation - Uber Eats store IDs are UUIDs
      if (!UUID_REGEX.test(args.platformStoreId)) {
        return {
          valid: false,
          error: "Format d'ID Uber Eats invalide. Un UUID est attendu (ex: 480eab8c-cc25-4c2b-b92f-70d7a1984f97).",
        };
      }

      const pkg = getPackageEnv();
      const siteE = getSiteEnv();
      const clientId = pkg.UBER_EATS_CLIENT_ID;
      const clientSecret = pkg.UBER_EATS_CLIENT_SECRET;
      const sandboxMode = siteE.UBER_EATS_SANDBOX_MODE === "true";

      if (!clientId || !clientSecret) {
        return {
          valid: false,
          error: "Credentials Uber Eats non configurees dans l'environnement",
        };
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      try {
        const { uberEats } = await import(
          "@be-in-digital/integrations"
        );

        if (sandboxMode) {
          // The sandbox API doesn't support /stores/{id}/status,
          // so we fetch the store details instead to validate credentials + storeId.
          const response = await uberEats.fetchUberEats(
            credentials,
            `/v1/eats/stores/${args.platformStoreId}`
          );
          if (!response.ok) {
            return {
              valid: false,
              error: sanitizeApiError(response.status, "Store ID Uber Eats"),
            };
          }
        } else {
          await uberEats.getStoreStatus(credentials, args.platformStoreId);
        }

        return { valid: true };
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        // Log full error server-side for debugging
        console.error(`[validateIntegration] Uber Eats error:`, raw);
        // Return sanitized message to client
        if (raw.includes("OAuth failed")) {
          return { valid: false, error: "Credentials Uber Eats invalides." };
        }
        if (raw.includes("Failed to get store status")) {
          return { valid: false, error: "Store ID Uber Eats introuvable ou inaccessible." };
        }
        return { valid: false, error: "Echec de la validation Uber Eats. Veuillez reessayer." };
      }
    } else {
      // Deliveroo
      // C-02: Input validation
      if (args.brandId && !UUID_REGEX.test(args.brandId)) {
        return {
          valid: false,
          error: "Format de Brand ID Deliveroo invalide. Un UUID est attendu (ex: 13eaa505-f059-479f-8ada-c24a1f9c56ec).",
        };
      }
      if (!args.platformStoreId || !NUMERIC_ID_REGEX.test(args.platformStoreId)) {
        return {
          valid: false,
          error: "Format d'ID restaurant Deliveroo invalide. Un identifiant numerique est attendu (ex: 101).",
        };
      }

      const pkg = getPackageEnv();
      const siteE = getSiteEnv();
      const clientId = pkg.DELIVEROO_CLIENT_ID;
      const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
      const sandboxMode = siteE.DELIVEROO_IS_SANDBOX === "true";

      if (!clientId || !clientSecret) {
        return {
          valid: false,
          error: "Credentials Deliveroo non configurees dans l'environnement",
        };
      }

      if (!args.brandId) {
        return {
          valid: false,
          error: "Le Brand ID Deliveroo est requis",
        };
      }

      const credentials = { clientId, clientSecret, sandboxMode };

      try {
        const { deliveroo } = await import(
          "@be-in-digital/integrations"
        );

        // Step 1: Validate credentials via OAuth
        await deliveroo.getAccessToken(credentials);

        // Step 2: Validate brandId by fetching menus (production only)
        // The Deliveroo sandbox API gateway rejects Bearer tokens,
        // so in sandbox mode we only validate credentials via OAuth.
        if (!sandboxMode) {
          const response = await deliveroo.fetchDeliveroo(
            credentials,
            `/v1/brands/${args.brandId}/menus`,
            {},
            "menu"
          );

          if (!response.ok) {
            return {
              valid: false,
              error: sanitizeApiError(response.status, "Brand ID Deliveroo"),
            };
          }
        }

        return { valid: true };
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        console.error(`[validateIntegration] Deliveroo error:`, raw);
        if (raw.includes("OAuth failed")) {
          return { valid: false, error: "Credentials Deliveroo invalides." };
        }
        return { valid: false, error: "Echec de la validation Deliveroo. Veuillez reessayer." };
      }
    }
  },
});
