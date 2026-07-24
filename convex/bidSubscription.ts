"use node";

/**
 * BeInDigital Subscription Actions (App Layer)
 *
 * "use node" file — ONLY action / internalAction here.
 * No mutations, no queries — those are in bidSubscriptionInternal.ts.
 *
 * Handles Stripe Checkout, Portal, and webhook event processing.
 */

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  resolvePlanFromPriceId,
  resolvePriceIdFromPlan,
  buildPriceMap,
} from "@be-in-digital/convex-functions/bidSubscription";
import {
  isMaintenanceSubscription,
  extractPeriodEndMs,
  MAINTENANCE_BID_PRODUCT,
} from "@be-in-digital/convex-functions/maintenance";
import { Role } from "@be-in-digital/core/auth/rbac";

// ============================================================================
// Helpers
// ============================================================================

function getStripe(): Stripe {
  const key = process.env.STRIPE_BID_SECRET_KEY;
  if (!key) throw new Error("STRIPE_BID_SECRET_KEY non configure");
  return new Stripe(key);
}

function getAppUrl(): string {
  const url = process.env.BID_APP_URL;
  if (!url) throw new Error("BID_APP_URL non configure");
  return url.replace(/\/$/, ""); // trim trailing slash
}

// ============================================================================
// createCheckoutSession — action auth
// ============================================================================

export const createCheckoutSession = action({
  args: {
    plan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    billing: v.optional(v.union(v.literal("monthly"), v.literal("annual"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifie");

    const ownerId = identity.subject;
    const stripe = getStripe();
    const appUrl = getAppUrl();
    const billing = args.billing ?? "monthly";

    // 1. Resolve priceId from plan + billing interval
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priceId = resolvePriceIdFromPlan(args.plan, process.env as any, billing);

    // 2. Check existing entitlements (internal query — no auth layer)
    const entitlements = await ctx.runQuery(
      internal.bidSubscriptionInternal.getByOwnerId,
      { ownerId }
    );

    // 3. Guard: prevent double subscription
    if (
      entitlements?.stripeSubscriptionId &&
      entitlements?.subscriptionStatus &&
      ["active", "trialing"].includes(entitlements.subscriptionStatus)
    ) {
      throw new Error(
        "Vous avez deja un abonnement actif. Gerez-le depuis le portail de facturation."
      );
    }

    // 4. Get or create Stripe customer
    let customerId = entitlements?.stripeCustomerId as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { ownerId },
        email: identity.email ?? undefined,
      });
      customerId = customer.id;

      // Save immediately — prevents duplicate customers on checkout abandonment
      await ctx.runMutation(
        internal.bidSubscriptionInternal.attachStripeCustomerId,
        { ownerId, stripeCustomerId: customerId }
      );
    }

    // 5. Create Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { ownerId },
      subscription_data: {
        metadata: { ownerId },
      },
      success_url: `${appUrl}/admin/subscription?status=success`,
      cancel_url: `${appUrl}/admin/subscription`,
    });

    return { url: session.url };
  },
});

// ============================================================================
// createPortalSession — action auth
// ============================================================================

export const createPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifie");

    const ownerId = identity.subject;
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const entitlements = await ctx.runQuery(
      internal.bidSubscriptionInternal.getByOwnerId,
      { ownerId }
    );

    const customerId = entitlements?.stripeCustomerId as string | undefined;
    if (!customerId) {
      throw new Error("Aucun abonnement Stripe lie a votre compte");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return { url: session.url };
  },
});

// ============================================================================
// createMaintenanceCheckoutSession — action auth (owner only)
// ============================================================================

/**
 * Stripe Checkout for the annual maintenance renewal.
 * Separate product from the autoBlog plans: the resulting subscription is
 * tagged `bidProduct: "maintenance"` and lands on `maintenanceContracts`
 * (via webhook), never on `ownerEntitlements`.
 */
export const createMaintenanceCheckoutSession = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Non authentifie");

    // Contract-level action: reserved to the account owner
    const user = await ctx.runQuery(
      internal.systemInternal.getAuthUserInternal,
      {}
    );
    if (user.role !== Role.CLIENT_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new Error("Action reservee au proprietaire du compte");
    }

    const priceId = process.env.STRIPE_BID_PRICE_MAINTENANCE;
    if (!priceId) {
      throw new Error(
        "Le renouvellement en ligne n'est pas configure (STRIPE_BID_PRICE_MAINTENANCE). Contactez BeInDigital."
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const ownerId = identity.subject;

    // Guard: renewal subscription already running
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { contract }: any = await ctx.runQuery(
      internal.maintenance._getUpdateGatingData,
      {}
    );
    if (contract?.stripeSubscriptionId && contract?.autoRenew) {
      throw new Error(
        "Le renouvellement automatique est deja actif. Gerez-le depuis le portail de facturation."
      );
    }

    // Reuse the Stripe customer shared with the autoBlog subscription
    const entitlements = await ctx.runQuery(
      internal.bidSubscriptionInternal.getByOwnerId,
      { ownerId }
    );
    let customerId = (contract?.stripeCustomerId ??
      entitlements?.stripeCustomerId) as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { ownerId },
        email: identity.email ?? undefined,
      });
      customerId = customer.id;

      // Save immediately — prevents duplicate customers on checkout abandonment
      await ctx.runMutation(
        internal.bidSubscriptionInternal.attachStripeCustomerId,
        { ownerId, stripeCustomerId: customerId }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { ownerId, bidProduct: MAINTENANCE_BID_PRODUCT },
      subscription_data: {
        metadata: { ownerId, bidProduct: MAINTENANCE_BID_PRODUCT },
      },
      success_url: `${appUrl}/dashboard/system?maintenance=success`,
      cancel_url: `${appUrl}/dashboard/system`,
    });

    return { url: session.url };
  },
});

// ============================================================================
// processWebhookEvent — internalAction "use node"
// ============================================================================

export const processWebhookEvent = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_BID_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_BID_WEBHOOK_SECRET non configure");

    // 1. Verify signature
    const event = stripe.webhooks.constructEvent(
      args.body,
      args.signature,
      webhookSecret
    );

    // 2. Build price map
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priceMap = buildPriceMap(process.env as any);

    // 3. Process event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const ownerId = session.metadata?.ownerId;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!customerId || !subscriptionId) {
          console.error("checkout.session.completed: missing customer or subscription ID");
          return;
        }

        // Retrieve subscription to get price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Maintenance renewal → contract, never ownerEntitlements
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isMaintenanceSubscription(subscription as any, process.env as any)) {
          await ctx.runMutation(internal.maintenance._applyStripeRenewal, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            periodEndMs: extractPeriodEndMs(subscription as any) ?? undefined,
            autoRenew: !subscription.cancel_at_period_end,
          });
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? resolvePlanFromPriceId(priceId, priceMap) : undefined;

        await ctx.runMutation(
          internal.bidSubscriptionInternal.upsertFromStripe,
          {
            ownerId: ownerId ?? undefined,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
            plan: plan ?? undefined,
          }
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? "";
        const ownerId = subscription.metadata?.ownerId;

        // Maintenance renewal → contract, never ownerEntitlements.
        // Coverage extends only while the subscription is in good standing
        // (a past_due period advance must not grant unpaid coverage).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isMaintenanceSubscription(subscription as any, process.env as any)) {
          const inGoodStanding = ["active", "trialing"].includes(
            subscription.status
          );
          await ctx.runMutation(internal.maintenance._applyStripeRenewal, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            periodEndMs: inGoodStanding
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                extractPeriodEndMs(subscription as any) ?? undefined
              : undefined,
            autoRenew: !subscription.cancel_at_period_end,
          });
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? resolvePlanFromPriceId(priceId, priceMap) : undefined;

        await ctx.runMutation(
          internal.bidSubscriptionInternal.upsertFromStripe,
          {
            ownerId: ownerId ?? undefined,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: subscription.status,
            plan: plan ?? undefined,
          }
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id ?? "";
        const ownerId = subscription.metadata?.ownerId;

        // Maintenance: the paid coverage stays until coveredUntil,
        // only auto-renew stops.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (isMaintenanceSubscription(subscription as any, process.env as any)) {
          await ctx.runMutation(internal.maintenance._applyStripeRenewal, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            autoRenew: false,
          });
          break;
        }

        await ctx.runMutation(
          internal.bidSubscriptionInternal.upsertFromStripe,
          {
            ownerId: ownerId ?? undefined,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "canceled",
            plan: undefined,
          }
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof sub === "string" ? sub : sub?.id ?? "unknown";
        console.warn(
          `Paiement echoue pour la subscription ${subscriptionId}. ` +
            "Le status sera mis a jour via customer.subscription.updated."
        );
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }
  },
});
