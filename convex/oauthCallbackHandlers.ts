import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// ---------------------------------------------------------------------------
// Stripe response shapes
// ---------------------------------------------------------------------------

interface StripeAccountResponse {
  id: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  error?: { message: string };
}

interface StripeAccountLinkResponse {
  url: string;
  error?: { message: string };
}

// ---------------------------------------------------------------------------
// Stripe: Account Links callback (return from onboarding)
// ---------------------------------------------------------------------------

/**
 * Handle the return redirect after Stripe Account Links onboarding.
 * Checks that the account has charges_enabled and stores the connection.
 */
// @unguarded-tracked: #162 — no CSRF state. `account_id` is taken from the
// query string and written to the deployment-level paymentConnections row,
// so anyone who learns the restaurant's acct_ id can rewrite its payment
// connection status. The single-use state infrastructure already exists and
// is used correctly by uberEatsOAuthHttp.
export const stripeCallback = httpAction(async (ctx, request) => {
  const { getSiteEnv } = await import("@be-in-digital/core/env");
  const site = getSiteEnv();
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const adminUrl = site.ADMIN_URL ?? "http://localhost:3000";

  if (!accountId) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent("Missing account ID")}` },
    });
  }

  const stripeKey = site.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent("Stripe not configured")}` },
    });
  }

  try {
    // Verify the account status
    const res = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(accountId)}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    const account = (await res.json()) as StripeAccountResponse;

    if (!res.ok || account.error) {
      throw new Error(account.error?.message ?? "Failed to verify Stripe account");
    }

    // Store the connection
    await ctx.runMutation(internal.paymentConnections.upsert, {
      provider: "stripe" as const,
      merchantId: accountId,
      status: account.charges_enabled ? "connected" as const : "error" as const,
    });

    if (!account.charges_enabled) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent("Inscription Stripe incomplète. Veuillez reconnecter pour terminer.")}` },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&connected=stripe` },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe callback error:", message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent(message)}` },
    });
  }
});

/**
 * Handle the refresh redirect when the Stripe onboarding link has expired.
 * Generates a new Account Link and redirects the user back to Stripe.
 */
// @unguarded-tracked: #162 — no CSRF state. Mints a fresh Stripe onboarding
// link for whatever account_id the query string names.
export const stripeRefresh = httpAction(async (ctx, request) => {
  const { getSiteEnv } = await import("@be-in-digital/core/env");
  const site = getSiteEnv();
  const url = new URL(request.url);
  const accountId = url.searchParams.get("account_id");
  const adminUrl = site.ADMIN_URL ?? "http://localhost:3000";

  if (!accountId) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent("Missing account ID")}` },
    });
  }

  const stripeKey = site.STRIPE_SECRET_KEY;
  const siteUrl = site.CONVEX_SITE_URL;
  if (!stripeKey || !siteUrl) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent("Stripe not configured")}` },
    });
  }

  try {
    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        account: accountId,
        return_url: `${siteUrl}/connect/stripe/callback?account_id=${accountId}`,
        refresh_url: `${siteUrl}/connect/stripe/refresh?account_id=${accountId}`,
        type: "account_onboarding",
      }),
    });
    const link = (await linkRes.json()) as StripeAccountLinkResponse;

    if (!linkRes.ok || link.error) {
      throw new Error(link.error?.message ?? "Failed to refresh Stripe link");
    }

    return new Response(null, {
      status: 302,
      headers: { Location: link.url },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe refresh error:", message);
    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent(message)}` },
    });
  }
});

// ---------------------------------------------------------------------------
// SumUp: OAuth callback handler
// ---------------------------------------------------------------------------

/**
 * Handle the SumUp OAuth redirect callback.
 * Delegates token exchange and encryption to the Node.js internalAction.
 */
// @unguarded-tracked: #162 — no CSRF state, and this is the severe one of
// the three: oauthConnect generates a state and never persists it, so an
// injected authorization code binds a third party's SumUp account and routes
// card payments into it. Described in full on the issue.
export const sumupCallback = httpAction(async (ctx, request) => {
  const { getSiteEnv } = await import("@be-in-digital/core/env");
  const site = getSiteEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const adminUrl = site.ADMIN_URL ?? "http://localhost:3000";

  if (error || !code) {
    const errorMsg =
      error ??
      url.searchParams.get("error_description") ??
      "Authorization denied";
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent(errorMsg)}`,
      },
    });
  }

  try {
    // Delegate token exchange + encryption to Node.js action
    await ctx.runAction(internal.oauthConnect.exchangeOAuthToken, {
      provider: "sumup" as const,
      code,
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `${adminUrl}/settings?tab=payments&connected=sumup` },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("SumUp OAuth callback error:", message);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${adminUrl}/settings?tab=payments&error=${encodeURIComponent(message)}`,
      },
    });
  }
});
