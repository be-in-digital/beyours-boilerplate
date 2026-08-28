import { components } from "./_generated/api";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

// Better Auth component client
export const authComponent = createClient<DataModel>(components.betterAuth);

// Better Auth server configuration
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      // Verification stays REQUIRED unless a deployment explicitly opts out.
      //
      // The e2e suite signs in as a seeded account, and `seed-users.mts` has no
      // mailbox to click a link in — so with verification always on, the suite
      // could never have authenticated at all. That is one of the reasons its
      // 510 tests had never run.
      //
      // Fail-closed on purpose: the flag must be SET to "true" to relax
      // anything, so an unset or mistyped variable keeps verification on. Set
      // it on a test deployment only — never on one a restaurant is served
      // from.
      requireEmailVerification:
        process.env.AUTH_ALLOW_UNVERIFIED_EMAIL !== "true",
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        const siteUrl = process.env.SITE_URL;
        // Must match what app/api/email/send/route.ts authenticates with:
        // EMAIL_API_SECRET when set, BETTER_AUTH_SECRET while migrating.
        const secret =
          process.env.EMAIL_API_SECRET ?? process.env.BETTER_AUTH_SECRET;
        if (!siteUrl || !secret) return;

        await fetch(`${siteUrl}/api/email/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            type: "passwordReset",
            to: user.email,
            data: {
              resetLink: url,
              expirationTime: "1 hour",
              userName: user.name ?? user.email,
            },
          }),
        });
      },
    },
    // DIVERGENCE DÉLIBÉRÉE vis-à-vis d'apps/reference — ne pas aligner.
    // Le banc d'essai fait confiance à localhost:3000-3003 parce que ses
    // espaces de travail se disputent les ports. Un site client n'a aucune
    // raison d'accepter une origine de développement : il tourne sur son
    // domaine. Élargir cette liste ici, c'est l'élargir chez le restaurateur.
    trustedOrigins: process.env.SITE_URL
      ? [process.env.SITE_URL, "http://localhost:3000"]
      : ["http://localhost:3000"],
    plugins: [convex({ authConfig })],
  });
};

// Query to get the currently authenticated user
// @guarded-inline: returns the caller's own session user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

// Client API for AuthBoundary component
export const { getAuthUser } = authComponent.clientApi();
