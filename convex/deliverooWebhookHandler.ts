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

    if (event.startsWith("order.") || order) {
      await ctx.runAction(internal.deliverooWebhook.processOrderWebhook, {
        payload: rawBody,
      });
    } else if (event.startsWith("menu.")) {
      await ctx.runAction(internal.deliverooWebhook.processMenuWebhook, {
        event,
        brandId: payload.brand_id ?? "",
        siteId: payload.site_id ?? "",
        payload: rawBody,
      });
    } else {
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
