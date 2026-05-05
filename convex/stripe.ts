/**
 * Stripe payment integration.
 *
 * The action `createPaymentIntent` creates a Stripe PaymentIntent and
 * returns the client secret to the browser. The browser then uses
 * Stripe Elements to collect the card and confirm the payment client-side.
 *
 * Order creation lives in `convex/orders.ts`. For the MVP, the client
 * calls `orders.create` directly after Stripe `confirmPayment` succeeds
 * (with a paymentIntentId reference). For production, replace this with
 * a Stripe webhook that creates the order server-side — never trust
 * the client to confirm payment.
 *
 * Required Convex env: STRIPE_SECRET_KEY (sk_test_... in dev, sk_live_... in prod)
 */
"use node"

import { v } from "convex/values"
import Stripe from "stripe"
import { action } from "./_generated/server"

export const createPaymentIntent = action({
  args: {
    amount: v.number(), // total en cents (ex: 1250 = 12.50 EUR)
    currency: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        storeId: v.string(),
        customerEmail: v.optional(v.string()),
      }),
    ),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set on Convex. Run: pnpx convex env set STRIPE_SECRET_KEY sk_test_...",
      )
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
    })

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(args.amount),
      currency: args.currency ?? "eur",
      automatic_payment_methods: { enabled: true },
      metadata: args.metadata,
    })

    if (!intent.client_secret) {
      throw new Error("Stripe did not return a client secret")
    }

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    }
  },
})
