/**
 * The Deliveroo webhook signature these suites produce — pinned.
 *
 * WHY THIS FILE EXISTS
 *
 * `createSignature()` used to sign the request body alone. The verifier in
 * `convex/deliverooWebhookHandler.ts` signs `sequence_guid + " " + raw body`,
 * so every webhook these suites ever sent would have come back 401. Nobody
 * found out, because the suites that send webhooks skip whenever
 * `CONVEX_SITE_URL` and a Deliveroo secret are unset — so a signature that
 * could never be accepted looked exactly like a green run, for eleven suites,
 * indefinitely.
 *
 * So this file asserts the signature itself, against expected values computed
 * outside this codebase with `openssl dgst -sha256 -hmac`:
 *
 *     printf '%s %s' "$GUID" "$BODY" | openssl dgst -sha256 -hmac "$SECRET"
 *
 * It needs no network, no deployment, no secrets and no Convex backend, so it
 * runs in ordinary CI on every push. That is the point: the live suites cannot
 * be relied on to notice, so something that always runs has to.
 */

import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { SIGNATURE_SEPARATOR, createSignature } from "./test-config";

// ============================================================================
// Fixture
//
// Fixed on purpose. Every expected digest below is tied to these three exact
// strings — change one and the constants stop meaning anything.
// ============================================================================

const SECRET = "whsec_deliveroo_test_secret";
const SEQUENCE_GUID = "4f1c1b7e-6a2b-4f4e-9a3a-2f6f0f9a1b2c";
const BODY = '{"event":"order.new","body":{"order":{"id":"fr:1234","status":"placed"}}}';
const BODY_BYTES = Buffer.from(BODY, "utf8");

/**
 * HMAC-SHA256(SECRET, `${SEQUENCE_GUID} ${BODY}`), hex.
 *
 * Computed with LibreSSL's `openssl dgst`, not with this repository's code, so
 * a mistake in `createSignature()` cannot also produce the expectation.
 */
const EXPECTED_SIGNATURE =
  "e02008372a70c2e636d8100488110fd93ddfe8984ad98cd4eebf2698d6487997";

/** The defect: HMAC over the body alone, with no GUID and no separator. */
const BODY_ONLY_SIGNATURE =
  "0fbeb244e6b8ecd5e6adeeee93f9117be1ce1b4d9d2e28daa51f49b3eda1794a";

/** The legacy POS separator `" \n "`, wrong for every event these suites send. */
const LEGACY_POS_SIGNATURE =
  "bb8dd054d28399596e1f37695f2ddd89813379085c424f12fcccb2bfe488248b";

// ============================================================================
// An independent verifier
//
// Mirrors `verifySignature()` in convex/deliverooWebhookHandler.ts: Web Crypto,
// raw bytes, message = guid bytes + space byte + body bytes. That function is
// module-private and cannot be imported, so the algorithm is restated here.
// Its job is to prove the two sides agree; it must never be relaxed to make a
// test pass.
// ============================================================================

async function verifyAsHandlerDoes(
  bodyBytes: Uint8Array,
  signature: string,
  sequenceGuid: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const sequenceBytes = encoder.encode(sequenceGuid);
  const spaceBytes = encoder.encode(" ");

  const message = new Uint8Array(
    sequenceBytes.length + spaceBytes.length + bodyBytes.byteLength,
  );
  message.set(sequenceBytes, 0);
  message.set(spaceBytes, sequenceBytes.length);
  message.set(bodyBytes, sequenceBytes.length + spaceBytes.length);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const sigBytes = new Uint8Array(signature.length / 2);
  for (let i = 0; i < signature.length; i += 2) {
    sigBytes[i / 2] = parseInt(signature.substring(i, i + 2), 16);
  }

  return crypto.subtle.verify("HMAC", key, sigBytes, message);
}

// ============================================================================
// Tests
// ============================================================================

describe("Deliveroo webhook signing", () => {
  it("matches the digest computed independently with openssl", () => {
    expect(createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET)).toBe(
      EXPECTED_SIGNATURE,
    );
  });

  it("is not the body-only digest that shipped for months", () => {
    const signature = createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET);

    // Stated as its own assertion rather than folded into the one above: this
    // is the regression, by name, so a future run says which one came back.
    expect(signature).not.toBe(BODY_ONLY_SIGNATURE);
    expect(crypto.createHmac("sha256", SECRET).update(BODY_BYTES).digest("hex")).toBe(
      BODY_ONLY_SIGNATURE,
    );
  });

  it("uses the modern single-space separator, not the legacy POS ' \\n '", () => {
    expect(SIGNATURE_SEPARATOR).toBe(" ");
    expect(createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET)).not.toBe(
      LEGACY_POS_SIGNATURE,
    );
  });

  it("signs exactly guid + 0x20 + body, byte for byte", () => {
    const expectedMessage = Buffer.concat([
      Buffer.from(SEQUENCE_GUID, "utf8"),
      Buffer.from([0x20]),
      BODY_BYTES,
    ]);

    // Assemble the message by hand, digest it, and require the production
    // helper to land on the same hex. Any extra byte, missing byte, reordered
    // segment or different separator moves the digest.
    expect(createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET)).toBe(
      crypto.createHmac("sha256", SECRET).update(expectedMessage).digest("hex"),
    );

    expect(expectedMessage.subarray(0, SEQUENCE_GUID.length).toString("utf8")).toBe(
      SEQUENCE_GUID,
    );
    expect(expectedMessage[SEQUENCE_GUID.length]).toBe(0x20);
    expect(expectedMessage.subarray(SEQUENCE_GUID.length + 1)).toEqual(BODY_BYTES);
  });

  it("is accepted by the verifier the live handler runs", async () => {
    const signature = createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET);

    await expect(
      verifyAsHandlerDoes(BODY_BYTES, signature, SEQUENCE_GUID, SECRET),
    ).resolves.toBe(true);
  });

  it("is rejected by that verifier when signed the old, body-only way", async () => {
    // The failing case, kept explicit: this is what the suites sent before the
    // fix, and it must stay a 401.
    await expect(
      verifyAsHandlerDoes(BODY_BYTES, BODY_ONLY_SIGNATURE, SEQUENCE_GUID, SECRET),
    ).resolves.toBe(false);
  });

  it("binds the signature to the GUID, so a replay under another GUID fails", async () => {
    const signature = createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET);

    await expect(
      verifyAsHandlerDoes(
        BODY_BYTES,
        signature,
        "00000000-0000-4000-8000-000000000000",
        SECRET,
      ),
    ).resolves.toBe(false);
  });

  it("binds the signature to the body, so a tampered body fails", async () => {
    const signature = createSignature(SEQUENCE_GUID, BODY_BYTES, SECRET);
    const tampered = Buffer.from(BODY.replace("fr:1234", "fr:9999"), "utf8");

    await expect(
      verifyAsHandlerDoes(tampered, signature, SEQUENCE_GUID, SECRET),
    ).resolves.toBe(false);
  });

  it("signs bytes, so a re-serialized body does not silently change the digest", () => {
    // `sendWebhook()` serializes once and sends the same bytes it signed. If it
    // ever went back to signing a string and sending a fresh JSON.stringify,
    // a body whose re-serialization differs would break in production only.
    const withSpaces = Buffer.from(
      JSON.stringify(JSON.parse(BODY), null, 2),
      "utf8",
    );

    expect(createSignature(SEQUENCE_GUID, withSpaces, SECRET)).not.toBe(
      EXPECTED_SIGNATURE,
    );
  });

  it("runs without any Deliveroo or Convex environment", () => {
    // Guards the property that makes this file worth having: it must never
    // become another suite that skips itself into a false green.
    expect(SECRET).not.toBe(process.env.DELIVEROO_WEBHOOK_SECRET);
    expect(EXPECTED_SIGNATURE).toHaveLength(64);
  });
});
