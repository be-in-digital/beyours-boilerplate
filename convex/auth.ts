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
      requireEmailVerification: true,
      minPasswordLength: 12,
      sendResetPassword: async ({ user, url }) => {
        const siteUrl = process.env.SITE_URL;
        const secret = process.env.BETTER_AUTH_SECRET;
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
    trustedOrigins: process.env.SITE_URL
      ? [process.env.SITE_URL, "http://localhost:3000"]
      : ["http://localhost:3000"],
    plugins: [convex({ authConfig })],
  });
};

// Query to get the currently authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

// Client API for AuthBoundary component
export const { getAuthUser } = authComponent.clientApi();
