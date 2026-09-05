/**
 * Uber Direct — status webhook
 *
 * Receives `dapi.status_changed` and keeps the order in step with the courier.
 *
 * Two rules govern every early return below:
 *
 * - **An unverified body is never read.** The signature is checked before the
 *   payload is parsed, in every environment. There is no sandbox bypass here,
 *   for the same reason there is none on the Deliveroo route.
 * - **A recognised-but-unusable event answers 200.** Uber retries on anything
 *   else, and retrying will not fix an order we do not have or a status we do
 *   not know. Only a genuine server fault deserves a 5xx.
 */

import { httpAction } from "./_generated/server";
import { captureBackendError } from "./errorReporting";
import { internal } from "./_generated/api";

// @guarded-inline: the HMAC is checked before the body is parsed — see the
// note at the top of this file
export const handleWebhook = httpAction(async (ctx, request) => {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-uber-signature") ?? "";

    const { getPackageEnv } = await import("@be-in-digital/core/env");
    const pkg = getPackageEnv();
    // Uber Direct rides on the same app credentials as Uber Eats; a dedicated
    // webhook secret takes precedence when one is configured.
    const signingSecret =
      pkg.UBER_DIRECT_WEBHOOK_SECRET ||
      pkg.UBER_EATS_WEBHOOK_SECRET ||
      pkg.UBER_EATS_CLIENT_SECRET;

    if (!signingSecret) {
      console.error("[Uber Direct Webhook] No signing secret configured");
      await captureBackendError(ctx, {
        error: new Error(
          "UBER_DIRECT_WEBHOOK_SECRET, UBER_EATS_WEBHOOK_SECRET and UBER_EATS_CLIENT_SECRET are all unset — every courier status update is refused with 503",
        ),
        source: "uberDirectWebhook",
        level: "fatal",
        tags: { step: "no-signing-secret" },
      });
      return new Response("Uber Direct credentials not configured", {
        status: 503,
      });
    }

    const { uberDirect } = await import("@be-in-digital/integrations");
    const isValid = await uberDirect.verifyUberDirectSignature(
      rawBody,
      signature,
      signingSecret
    );

    if (!isValid) {
      console.error("[Uber Direct Webhook] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }

    let payload: {
      event_type?: string;
      event_id?: string;
      meta?: { order_id?: string; status?: string };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response("Malformed JSON", { status: 400 });
    }

    // Uber sends other event types on the same endpoint; acknowledge and drop.
    if (payload.event_type !== "dapi.status_changed") {
      return new Response("", { status: 200 });
    }

    const deliveryId = payload.meta?.order_id;
    const status = payload.meta?.status;
    if (!deliveryId || !status) {
      console.error(
        `[Uber Direct Webhook] Event ${payload.event_id ?? "?"} has no order_id or status`
      );
      return new Response("", { status: 200 });
    }

    const result = await ctx.runMutation(
      internal.uberDirectInternal.applyDeliveryStatus,
      { deliveryId, status }
    );

    if (!result.applied) {
      console.warn(
        `[Uber Direct Webhook] Dropped ${status} for ${deliveryId}: ${result.reason}`
      );
    }

    return new Response("", { status: 200 });
  } catch (error) {
    // A genuine fault on our side: let Uber retry.
    console.error("[Uber Direct Webhook] Unhandled error", error);
    await captureBackendError(ctx, {
      error,
      source: "uberDirectWebhook",
      tags: { step: "unhandled" },
    });
    return new Response("Internal error", { status: 500 });
  }
});
