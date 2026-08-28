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
import type * as authHelpers from "../authHelpers.js";
import type * as autoTranslate from "../autoTranslate.js";
import type * as bidStripeWebhook from "../bidStripeWebhook.js";
import type * as bidSubscription from "../bidSubscription.js";
import type * as bidSubscriptionInternal from "../bidSubscriptionInternal.js";
import type * as blog from "../blog.js";
import type * as blogAutoConfig from "../blogAutoConfig.js";
import type * as blogAutoGenerate from "../blogAutoGenerate.js";
import type * as blogAutoGenerateInternal from "../blogAutoGenerateInternal.js";
import type * as blogAutoTranslate from "../blogAutoTranslate.js";
import type * as blogAutoUsage from "../blogAutoUsage.js";
import type * as blogImageGenerate from "../blogImageGenerate.js";
import type * as blogImageGenerateInternal from "../blogImageGenerateInternal.js";
import type * as categories from "../categories.js";
import type * as cms from "../cms.js";
import type * as cmsAltText from "../cmsAltText.js";
import type * as cmsAutoTranslate from "../cmsAutoTranslate.js";
import type * as cmsMedia from "../cmsMedia.js";
import type * as cmsMediaConfirmUpload from "../cmsMediaConfirmUpload.js";
import type * as cmsMediaProcess from "../cmsMediaProcess.js";
import type * as cmsSeed from "../cmsSeed.js";
import type * as cmsSeedData from "../cmsSeedData.js";
import type * as cmsSvgUpload from "../cmsSvgUpload.js";
import type * as contactMessages from "../contactMessages.js";
import type * as customerAddresses from "../customerAddresses.js";
import type * as deliverooImport from "../deliverooImport.js";
import type * as deliverooMenuSync from "../deliverooMenuSync.js";
import type * as deliverooOrders from "../deliverooOrders.js";
import type * as deliverooWebhook from "../deliverooWebhook.js";
import type * as deliverooWebhookHandler from "../deliverooWebhookHandler.js";
import type * as deliveryQuotes from "../deliveryQuotes.js";
import type * as emailAutomations from "../emailAutomations.js";
import type * as emailCampaignActions from "../emailCampaignActions.js";
import type * as emailCampaigns from "../emailCampaigns.js";
import type * as emailConfig from "../emailConfig.js";
import type * as emailEvents from "../emailEvents.js";
import type * as emailHttpHandlers from "../emailHttpHandlers.js";
import type * as emailSegments from "../emailSegments.js";
import type * as emailSubscribers from "../emailSubscribers.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as externalProductMappings from "../externalProductMappings.js";
import type * as favorites from "../favorites.js";
import type * as gameEmail from "../gameEmail.js";
import type * as gamePlay from "../gamePlay.js";
import type * as gameQRCodes from "../gameQRCodes.js";
import type * as games from "../games.js";
import type * as globalSettings from "../globalSettings.js";
import type * as http from "../http.js";
import type * as imageToProduct from "../imageToProduct.js";
import type * as kitchenTickets from "../kitchenTickets.js";
import type * as languages from "../languages.js";
import type * as lib_storeFunctions from "../lib/storeFunctions.js";
import type * as maintenance from "../maintenance.js";
import type * as maintenanceEmail from "../maintenanceEmail.js";
import type * as menus from "../menus.js";
import type * as migrations from "../migrations.js";
import type * as migrations_index from "../migrations/index.js";
import type * as oauthCallbackHandlers from "../oauthCallbackHandlers.js";
import type * as oauthConnect from "../oauthConnect.js";
import type * as oauthState from "../oauthState.js";
import type * as orders from "../orders.js";
import type * as orphanProducts from "../orphanProducts.js";
import type * as ownerEntitlements from "../ownerEntitlements.js";
import type * as paymentConnections from "../paymentConnections.js";
import type * as payments from "../payments.js";
import type * as paypal from "../paypal.js";
import type * as prizeRedemptions from "../prizeRedemptions.js";
import type * as prizes from "../prizes.js";
import type * as products from "../products.js";
import type * as promotions from "../promotions.js";
import type * as requiredActions from "../requiredActions.js";
import type * as seed from "../seed.js";
import type * as seedFixture from "../seedFixture.js";
import type * as seedKitchenOrders from "../seedKitchenOrders.js";
import type * as storageUpload from "../storageUpload.js";
import type * as storeIntegrations from "../storeIntegrations.js";
import type * as stores from "../stores.js";
import type * as stripe from "../stripe.js";
import type * as stripeWebhook from "../stripeWebhook.js";
import type * as stripeWebhookVerify from "../stripeWebhookVerify.js";
import type * as sumup from "../sumup.js";
import type * as system from "../system.js";
import type * as systemInternal from "../systemInternal.js";
import type * as teamMembers from "../teamMembers.js";
import type * as teamMembersEmail from "../teamMembersEmail.js";
import type * as translations from "../translations.js";
import type * as uberDirect from "../uberDirect.js";
import type * as uberDirectInternal from "../uberDirectInternal.js";
import type * as uberDirectWebhook from "../uberDirectWebhook.js";
import type * as uberEatsActions from "../uberEatsActions.js";
import type * as uberEatsConnections from "../uberEatsConnections.js";
import type * as uberEatsImport from "../uberEatsImport.js";
import type * as uberEatsMenuSync from "../uberEatsMenuSync.js";
import type * as uberEatsOAuth from "../uberEatsOAuth.js";
import type * as uberEatsOAuthHttp from "../uberEatsOAuthHttp.js";
import type * as uberEatsOrders from "../uberEatsOrders.js";
import type * as uberEatsWebhook from "../uberEatsWebhook.js";
import type * as unsplashSearch from "../unsplashSearch.js";
import type * as userProfiles from "../userProfiles.js";
import type * as validateIntegration from "../validateIntegration.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authHelpers: typeof authHelpers;
  autoTranslate: typeof autoTranslate;
  bidStripeWebhook: typeof bidStripeWebhook;
  bidSubscription: typeof bidSubscription;
  bidSubscriptionInternal: typeof bidSubscriptionInternal;
  blog: typeof blog;
  blogAutoConfig: typeof blogAutoConfig;
  blogAutoGenerate: typeof blogAutoGenerate;
  blogAutoGenerateInternal: typeof blogAutoGenerateInternal;
  blogAutoTranslate: typeof blogAutoTranslate;
  blogAutoUsage: typeof blogAutoUsage;
  blogImageGenerate: typeof blogImageGenerate;
  blogImageGenerateInternal: typeof blogImageGenerateInternal;
  categories: typeof categories;
  cms: typeof cms;
  cmsAltText: typeof cmsAltText;
  cmsAutoTranslate: typeof cmsAutoTranslate;
  cmsMedia: typeof cmsMedia;
  cmsMediaConfirmUpload: typeof cmsMediaConfirmUpload;
  cmsMediaProcess: typeof cmsMediaProcess;
  cmsSeed: typeof cmsSeed;
  cmsSeedData: typeof cmsSeedData;
  cmsSvgUpload: typeof cmsSvgUpload;
  contactMessages: typeof contactMessages;
  customerAddresses: typeof customerAddresses;
  deliverooImport: typeof deliverooImport;
  deliverooMenuSync: typeof deliverooMenuSync;
  deliverooOrders: typeof deliverooOrders;
  deliverooWebhook: typeof deliverooWebhook;
  deliverooWebhookHandler: typeof deliverooWebhookHandler;
  deliveryQuotes: typeof deliveryQuotes;
  emailAutomations: typeof emailAutomations;
  emailCampaignActions: typeof emailCampaignActions;
  emailCampaigns: typeof emailCampaigns;
  emailConfig: typeof emailConfig;
  emailEvents: typeof emailEvents;
  emailHttpHandlers: typeof emailHttpHandlers;
  emailSegments: typeof emailSegments;
  emailSubscribers: typeof emailSubscribers;
  emailTemplates: typeof emailTemplates;
  externalProductMappings: typeof externalProductMappings;
  favorites: typeof favorites;
  gameEmail: typeof gameEmail;
  gamePlay: typeof gamePlay;
  gameQRCodes: typeof gameQRCodes;
  games: typeof games;
  globalSettings: typeof globalSettings;
  http: typeof http;
  imageToProduct: typeof imageToProduct;
  kitchenTickets: typeof kitchenTickets;
  languages: typeof languages;
  "lib/storeFunctions": typeof lib_storeFunctions;
  maintenance: typeof maintenance;
  maintenanceEmail: typeof maintenanceEmail;
  menus: typeof menus;
  migrations: typeof migrations;
  "migrations/index": typeof migrations_index;
  oauthCallbackHandlers: typeof oauthCallbackHandlers;
  oauthConnect: typeof oauthConnect;
  oauthState: typeof oauthState;
  orders: typeof orders;
  orphanProducts: typeof orphanProducts;
  ownerEntitlements: typeof ownerEntitlements;
  paymentConnections: typeof paymentConnections;
  payments: typeof payments;
  paypal: typeof paypal;
  prizeRedemptions: typeof prizeRedemptions;
  prizes: typeof prizes;
  products: typeof products;
  promotions: typeof promotions;
  requiredActions: typeof requiredActions;
  seed: typeof seed;
  seedFixture: typeof seedFixture;
  seedKitchenOrders: typeof seedKitchenOrders;
  storageUpload: typeof storageUpload;
  storeIntegrations: typeof storeIntegrations;
  stores: typeof stores;
  stripe: typeof stripe;
  stripeWebhook: typeof stripeWebhook;
  stripeWebhookVerify: typeof stripeWebhookVerify;
  sumup: typeof sumup;
  system: typeof system;
  systemInternal: typeof systemInternal;
  teamMembers: typeof teamMembers;
  teamMembersEmail: typeof teamMembersEmail;
  translations: typeof translations;
  uberDirect: typeof uberDirect;
  uberDirectInternal: typeof uberDirectInternal;
  uberDirectWebhook: typeof uberDirectWebhook;
  uberEatsActions: typeof uberEatsActions;
  uberEatsConnections: typeof uberEatsConnections;
  uberEatsImport: typeof uberEatsImport;
  uberEatsMenuSync: typeof uberEatsMenuSync;
  uberEatsOAuth: typeof uberEatsOAuth;
  uberEatsOAuthHttp: typeof uberEatsOAuthHttp;
  uberEatsOrders: typeof uberEatsOrders;
  uberEatsWebhook: typeof uberEatsWebhook;
  unsplashSearch: typeof unsplashSearch;
  userProfiles: typeof userProfiles;
  validateIntegration: typeof validateIntegration;
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
