/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_admin from "../auth_admin.js";
import type * as categories from "../categories.js";
import type * as contactMessages from "../contactMessages.js";
import type * as emailAutomations from "../emailAutomations.js";
import type * as emailCampaigns from "../emailCampaigns.js";
import type * as emailConfig from "../emailConfig.js";
import type * as emailEvents from "../emailEvents.js";
import type * as emailSegments from "../emailSegments.js";
import type * as emailSubscribers from "../emailSubscribers.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as http from "../http.js";
import type * as languages from "../languages.js";
import type * as menus from "../menus.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as products from "../products.js";
import type * as promotions from "../promotions.js";
import type * as seed from "../seed.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as teamMembers from "../teamMembers.js";
import type * as userProfiles from "../userProfiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  auth_admin: typeof auth_admin;
  categories: typeof categories;
  contactMessages: typeof contactMessages;
  emailAutomations: typeof emailAutomations;
  emailCampaigns: typeof emailCampaigns;
  emailConfig: typeof emailConfig;
  emailEvents: typeof emailEvents;
  emailSegments: typeof emailSegments;
  emailSubscribers: typeof emailSubscribers;
  emailTemplates: typeof emailTemplates;
  http: typeof http;
  languages: typeof languages;
  menus: typeof menus;
  orders: typeof orders;
  payments: typeof payments;
  products: typeof products;
  promotions: typeof promotions;
  seed: typeof seed;
  stores: typeof stores;
  stripe: typeof stripe;
  teamMembers: typeof teamMembers;
  userProfiles: typeof userProfiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
