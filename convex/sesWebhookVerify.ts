"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Verify the RSA signature Amazon SNS puts on every message.
 *
 * `/webhooks/ses` used to authenticate nothing: it checked that the body's own
 * `SigningCertURL` field looked like an Amazon host and treated that as proof.
 * An unauthenticated POST could therefore forge a bounce or a complaint for any
 * address — the handler reads the subscriber, store and campaign ids straight
 * out of the same unsigned body — suppressing mail to a real customer and
 * moving the campaign counters with it.
 *
 * Node, not the V8 runtime, for the same reason as `stripeWebhookVerify.ts`:
 * `crypto.createVerify` takes a PEM certificate directly, where Web Crypto
 * would need the SubjectPublicKeyInfo picked out of the X.509 DER by hand.
 */
export const verify = internalAction({
  args: {
    /** The raw JSON body, exactly as received. */
    body: v.string(),
  },
  handler: async (_ctx, args): Promise<{ valid: boolean; reason?: string }> => {
    const {
      buildSnsStringToSign,
      canVerify,
      hashAlgorithmFor,
      isValidSigningCertUrl,
    } = await import("@be-in-digital/convex-functions/snsSignature");

    let message: Record<string, unknown>;
    try {
      message = JSON.parse(args.body);
    } catch {
      return { valid: false, reason: "unparseable" };
    }

    if (!canVerify(message)) {
      return { valid: false, reason: "incomplete" };
    }

    const certUrl = String(message.SigningCertURL);
    // Checked again here rather than trusted from `canVerify`: this is the line
    // that decides which host we make a request to, and it should be readable
    // as such at the point of the fetch.
    if (!isValidSigningCertUrl(certUrl)) {
      return { valid: false, reason: "cert_host" };
    }

    let certPem: string;
    try {
      const response = await fetch(certUrl);
      if (!response.ok) return { valid: false, reason: "cert_unreachable" };
      certPem = await response.text();
    } catch {
      return { valid: false, reason: "cert_unreachable" };
    }

    const algorithm = hashAlgorithmFor(String(message.SignatureVersion));
    const stringToSign = buildSnsStringToSign(message);
    if (!algorithm || stringToSign === null) {
      return { valid: false, reason: "incomplete" };
    }

    const crypto = await import("node:crypto");
    try {
      const verifier = crypto.createVerify(
        algorithm === "sha1" ? "RSA-SHA1" : "RSA-SHA256"
      );
      verifier.update(stringToSign, "utf8");
      const valid = verifier.verify(certPem, String(message.Signature), "base64");
      return valid ? { valid: true } : { valid: false, reason: "bad_signature" };
    } catch {
      // A malformed certificate or signature is a rejection, never a pass.
      return { valid: false, reason: "bad_signature" };
    }
  },
});
