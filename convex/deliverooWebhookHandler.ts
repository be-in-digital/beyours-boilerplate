import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Deliveroo webhook HTTP handler with signature verification.
 *
 * Receives webhooks from Deliveroo, verifies the HMAC-SHA256 signature,
 * then dispatches to internal actions for processing.
 *
 * Signature: HMAC-SHA256(secret, sequence_guid_bytes + space + raw_body_bytes)
 * Uses raw ArrayBuffer (not text) per Deliveroo docs.
 */
// @guarded-inline: verifies Deliveroo's HMAC-SHA256 over sequence guid and
// raw body before acting on either
export const handleWebhook = httpAction(async (ctx, request) => {
  try {
    // Read as ArrayBuffer first (required for correct HMAC verification)
    const buffer = await request.arrayBuffer();
    const rawBody = new TextDecoder().decode(buffer);

    const signature = request.headers.get("x-deliveroo-hmac-sha256") ?? "";
    const sequenceGuid = request.headers.get("x-deliveroo-sequence-guid") ?? "";

    console.log(`[Deliveroo Webhook] Received - sig: ${signature ? "present" : "missing"}, guid: ${sequenceGuid || "none"}, bodyLen: ${rawBody.length}`);

    // Read signing secret from environment (BeYours platform credentials)
    const { getPackageEnv } = await import("@be-in-digital/core/env");
    const pkg = getPackageEnv();
    const webhookSecret = pkg.DELIVEROO_WEBHOOK_SECRET;
    const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
    const signingSecret = webhookSecret || clientSecret;

    if (!signingSecret) {
      console.error("[Deliveroo Webhook] No signing secret configured");
      return new Response("Deliveroo credentials not configured in environment", { status: 503 });
    }

    // Verify webhook signature using raw bytes
    let isValid = false;
    if (signature && sequenceGuid) {
      isValid = await verifySignature(buffer, signature, sequenceGuid, signingSecret);
    }

    console.log(`[Deliveroo Webhook] Signature verification: ${isValid ? "VALID" : "INVALID"}`);

    if (!isValid) {
      // Fail-closed in ALL environments, including sandbox. Deliveroo signs
      // sandbox webhooks too, so a correct DELIVEROO_WEBHOOK_SECRET must be
      // configured. Never process an unverified webhook (forgery risk).
      console.error("[Deliveroo Webhook] Invalid signature - rejecting");
      return new Response("Invalid signature", { status: 401 });
    }

    // Parse the payload to determine event type
    const payload = JSON.parse(rawBody) as {
      event?: string;
      body?: { order?: Record<string, unknown> };
      order?: Record<string, unknown>;
      brand_id?: string;
      site_id?: string;
    };

    const event = payload.event ?? "";
    const order = payload.body?.order ?? payload.order;

    // What the HTTP status means to Deliveroo, and why each branch below picks
    // the one it picks.
    //
    // A 2xx is an acknowledgement: Deliveroo considers the event delivered and
    // never sends it again. Anything else is retried with exponential backoff
    // — up to 6 minutes for an ASAP `order.new`, 30 minutes for a scheduled
    // one, 10 minutes for `order.status_update`.
    //
    // This handler used to answer 200 unconditionally, including when
    // processing had failed. A Deliveroo order that could not be routed was
    // therefore lost in silence: no retry, no ticket, no trace outside a log
    // line, and a customer waiting on food nobody was cooking.
    //
    // The opposite mistake is just as real. The Order API success rate must
    // stay at or above 98% or partner access can be suspended, so a benign
    // no-op must NOT be dressed up as a failure. Hence three outcomes, not
    // two:
    //
    //   - processed, duplicate, or an event we deliberately ignore  -> 200
    //   - failed, and a redelivery could succeed                    -> 500
    //   - failed, and a redelivery would fail identically           -> 200
    //
    // The processor itself makes the last distinction: it knows whether the
    // failure was a malformed body (hopeless) or a lookup that could succeed
    // on the next attempt. See `retryable` in `deliverooWebhook.ts`.
    if (event.startsWith("order.") || order) {
      const result = await ctx.runAction(internal.deliverooWebhook.processOrderWebhook, {
        payload: rawBody,
      });
      if (!result.success && result.retryable !== false) {
        console.error(`[Deliveroo Webhook] Order processing failed, asking for a retry: ${result.error ?? "unknown error"}`);
        return new Response("Order processing failed", { status: 500 });
      }
      if (!result.success) {
        console.error(`[Deliveroo Webhook] Order processing failed permanently, not retryable: ${result.error ?? "unknown error"}`);
      }
    } else if (event.startsWith("menu.")) {
      const result = await ctx.runAction(internal.deliverooWebhook.processMenuWebhook, {
        event,
        brandId: payload.brand_id ?? "",
        siteId: payload.site_id ?? "",
        payload: rawBody,
      });
      if (!result.success && result.retryable !== false) {
        console.error(`[Deliveroo Webhook] Menu processing failed, asking for a retry: ${result.error ?? "unknown error"}`);
        return new Response("Menu processing failed", { status: 500 });
      }
      if (!result.success) {
        console.error(`[Deliveroo Webhook] Menu processing failed permanently, not retryable: ${result.error ?? "unknown error"}`);
      }
    } else {
      // An event type we do not handle — a rider update, say. Nothing was
      // lost and nothing will change on redelivery, so acknowledge it.
      console.log(`Unknown Deliveroo webhook event: ${event || "no event field"}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Deliveroo webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});

/**
 * Verify Deliveroo HMAC-SHA256 signature on raw bytes.
 * Message = sequence_guid_bytes + space_byte + raw_body_bytes
 */
async function verifySignature(
  body: ArrayBuffer,
  signature: string,
  sequenceGuid: string,
  secret: string
): Promise<boolean> {
  try {
    const cleanSig = signature.replace(/^sha256=/, "").trim();
    const encoder = new TextEncoder();

    const keyData = encoder.encode(secret);
    const sequenceBytes = encoder.encode(sequenceGuid);
    const spaceBytes = encoder.encode(" ");

    // Build message: guid + space + body
    const message = new Uint8Array(
      sequenceBytes.length + spaceBytes.length + body.byteLength
    );
    message.set(sequenceBytes, 0);
    message.set(spaceBytes, sequenceBytes.length);
    message.set(new Uint8Array(body), sequenceBytes.length + spaceBytes.length);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify", "sign"]
    );

    const sigBuffer = hexToBuffer(cleanSig);
    const isValid = await crypto.subtle.verify("HMAC", cryptoKey, sigBuffer, message);

    if (!isValid) {
      console.warn(`[Sig Debug] Signature mismatch - received: ${cleanSig.substring(0, 8)}..., secret configured: yes`);
    }

    return isValid;
  } catch (error) {
    console.error("[Sig Error]", error);
    return false;
  }
}

function hexToBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const buffer = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    buffer[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return buffer.buffer;
}
