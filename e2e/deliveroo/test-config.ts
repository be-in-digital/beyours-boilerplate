/**
 * Deliveroo Integration - Test Configuration
 * Shared configuration and utilities for all Deliveroo scenario tests
 */

import crypto from "node:crypto";

// ============================================================================
// Environment Configuration
// ============================================================================

export const config = {
  // No fallback on purpose. This used to default to a real dev deployment
  // (reliable-parrot-452), so an unconfigured run posted signed Deliveroo
  // webhooks at a backend nobody had asked for. Unset now means unset, and
  // sendWebhook() refuses rather than picking a target for you.
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL || "",
  WEBHOOK_SECRET: process.env.DELIVEROO_WEBHOOK_SECRET || process.env.DELIVEROO_CLIENT_SECRET || "",
  CLIENT_ID: process.env.DELIVEROO_CLIENT_ID || "",
  CLIENT_SECRET: process.env.DELIVEROO_CLIENT_SECRET || "",
  BRAND_ID: process.env.DELIVEROO_BRAND_ID || "",
  SITE_ID: process.env.DELIVEROO_SITE_ID || "SFM-MRS-PRA-01",
  IS_SANDBOX: true,
  // Convex HTTP route for Deliveroo webhooks
  ORDER_WEBHOOK_PATH: "/webhooks/deliveroo/order",
  MENU_WEBHOOK_PATH: "/webhooks/deliveroo/menu",
};

// ============================================================================
// Utilities
// ============================================================================

// NOTE: unlike apps/reference, this copy has no `hasWebhookTarget` /
// `hasDeliverooSandbox` gate, and none of the scenario suites here wrap their
// cases in `it.runIf(...)`. Today that is dormant: `vitest.config.ts` excludes
// `**/e2e/**` outright and the Playwright projects only match `*.spec.ts`, so
// these suites run in neither runner. If the exclude is ever narrowed the way
// apps/reference narrowed its own, port the gate across at the same time —
// otherwise these tests go from never running to running unconditionally.

/**
 * Create HMAC SHA256 signature for webhook authentication
 */
export function createSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Send webhook to Convex HTTP endpoint
 */
export async function sendWebhook(payload: unknown, path?: string): Promise<Response> {
  if (!config.CONVEX_SITE_URL) {
    throw new Error(
      "CONVEX_SITE_URL is not set: refusing to send a signed Deliveroo webhook " +
        "with no explicit target. Set it to the deployment you mean to hit.",
    );
  }

  const payloadString = JSON.stringify(payload);
  const signingSecret = config.WEBHOOK_SECRET || config.CLIENT_SECRET;
  const signature = createSignature(payloadString, signingSecret);
  const sequenceGuid = crypto.randomUUID();

  const url = `${config.CONVEX_SITE_URL}${path || config.ORDER_WEBHOOK_PATH}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-deliveroo-hmac-sha256": signature,
      "x-deliveroo-sequence-guid": sequenceGuid,
      "x-deliveroo-request-id": sequenceGuid,
    },
    body: payloadString,
  });
}

/**
 * Wait for a specific duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate test order ID
 */
export function generateOrderId(prefix: string = "test"): string {
  return `fr:${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  return `ORD-${Date.now().toString().slice(-8)}`;
}

// ============================================================================
// Common Webhook Builders
// ============================================================================

interface DeliverooPrice {
  fractional: number;
  currency_code: string;
}

interface DeliverooWebhookOrder {
  id: string;
  order_number: string;
  location_id: string;
  display_id: string;
  status: string;
  status_log: Array<{ at: string; status: string }>;
  fulfillment_type: string;
  asap: boolean;
  total_price: DeliverooPrice;
  partner_order_total: DeliverooPrice;
  items: Array<Record<string, unknown>>;
  start_preparing_at: string;
  confirm_at?: string;
  offer_discount?: DeliverooPrice;
  meal_card_payment?: DeliverooPrice;
  cash_due?: DeliverooPrice;
  customer?: Record<string, unknown>;
  delivery_address?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DeliverooWebhookPayload {
  event: string;
  body: {
    order: DeliverooWebhookOrder;
  };
}

/**
 * Create order.new webhook (Deliveroo order.created format)
 */
export function createNewOrderWebhook(overrides: Partial<Record<string, unknown>> = {}): DeliverooWebhookPayload {
  const orderId = (overrides.id as string) || generateOrderId("new");
  const orderNumber = (overrides.order_number as string) || generateOrderNumber();

  return {
    event: "order.new",
    body: {
      order: {
        id: orderId,
        order_number: orderNumber,
        location_id: config.SITE_ID,
        display_id: orderNumber.slice(-4),
        status: "placed",
        status_log: [
          { at: new Date().toISOString(), status: "pending" },
          { at: new Date().toISOString(), status: "placed" },
        ],
        fulfillment_type: "deliveroo",
        asap: true,
        total_price: { fractional: 2500, currency_code: "EUR" },
        partner_order_total: { fractional: 2500, currency_code: "EUR" },
        items: [
          {
            pos_item_id: "ITEM-TEST-001",
            quantity: 1,
            name: "Test Item",
            unit_price: { fractional: 2500, currency_code: "EUR" },
            total_price: { fractional: 2500, currency_code: "EUR" },
          },
        ],
        start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        ...overrides,
      },
    },
  };
}

/**
 * Create order.status_update webhook
 */
export function createStatusUpdateWebhook(orderId: string, status: string) {
  return {
    event: "order.status_update",
    body: {
      order: {
        id: orderId,
        status: status,
        status_log: [{ at: new Date().toISOString(), status: status }],
      },
    },
  };
}

/**
 * Create remake order webhook
 */
export function createRemakeOrderWebhook(
  parentOrderId: string,
  fault: "deliveroo" | "restaurant",
) {
  const orderId = generateOrderId("remake");
  const orderNumber = generateOrderNumber();
  const orderCost = fault === "deliveroo" ? 2500 : 0;
  const totalPrice = fault === "deliveroo" ? 2500 : 0;

  const baseWebhook = createNewOrderWebhook({
    id: orderId,
    order_number: orderNumber,
    total_price: { fractional: totalPrice, currency_code: "EUR" },
  });

  return {
    ...baseWebhook,
    body: {
      ...baseWebhook.body,
      order: {
        ...baseWebhook.body.order,
        remake_details: {
          fault: fault as string,
          parent_order_id: parentOrderId,
          order_cost: orderCost,
        },
      },
    },
  };
}

// ============================================================================
// Test Assertions
// ============================================================================

/**
 * Assert webhook response is successful (200 OK)
 */
export async function assertWebhookSuccess(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Webhook failed: ${response.status} ${response.statusText} - ${text}`,
    );
  }
  const text = await response.text();
  return text;
}

/**
 * Assert remake details are valid
 */
export function assertRemakeDetails(
  remakeDetails: { parent_order_id: string; fault: string },
  expectedParentId: string,
  expectedFault: string,
) {
  if (!remakeDetails) {
    throw new Error("remake_details is missing");
  }
  if (remakeDetails.parent_order_id !== expectedParentId) {
    throw new Error(
      `Expected parent_order_id to be ${expectedParentId}, got ${remakeDetails.parent_order_id}`,
    );
  }
  if (remakeDetails.fault !== expectedFault) {
    throw new Error(
      `Expected fault to be ${expectedFault}, got ${remakeDetails.fault}`,
    );
  }
}

// ============================================================================
// Logging Helpers
// ============================================================================

export const log = {
  info: (message: string) => console.log(`  ${message}`),
  success: (message: string) => console.log(`  ${message}`),
  error: (message: string) => console.error(`  ${message}`),
  test: (message: string) => console.log(`  ${message}`),
  wait: (message: string) => console.log(`  ${message}`),
};
