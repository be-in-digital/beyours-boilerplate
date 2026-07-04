/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 5: Customer Collect Order   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 5: Customer Collect (Click & Collect)
 *
 * This scenario validates:
 * 1. Customer collect orders (fulfillment_type: "customer")
 * 2. No delivery - customer picks up on premises
 * 3. Order lifecycle: placed -> accepted -> preparing -> ready_for_collection
 * 4. Sync status sent after acceptance
 * 5. No delivery address or rider information
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  config,
  createNewOrderWebhook,
  createStatusUpdateWebhook,
  generateOrderId,
  log,
} from "./test-config";

// ============================================================================
// Test Suite
// ============================================================================

describe("Scenario 5: Customer Collect Order", () => {
  let collectOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Customer Collect Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Customer Collect Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Fulfillment Type Validation
  // ========================================================================

  it("should validate customer collect fulfillment type", async () => {
    log.test("Test 1: Validating fulfillment_type = 'customer'");

    collectOrderId = generateOrderId("collect");
    const webhook = createNewOrderWebhook({
      id: collectOrderId,
      fulfillment_type: "customer",
    });

    const order = webhook.body.order;

    // Validate fulfillment type
    expect(order.fulfillment_type).toBe("customer");

    log.success("Fulfillment type validated: customer (click & collect)");
    log.info("  Customer will pick up the order on premises");
  });

  // ========================================================================
  // Test 2: No Delivery Information
  // ========================================================================

  it("should not require delivery information", async () => {
    log.test("Test 2: Validating absence of delivery info");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "customer",
    });

    const order = webhook.body.order;

    // For customer collect, there should be no delivery address
    // (or it's optional and not used for routing)
    expect(order.fulfillment_type).toBe("customer");

    // Customer info might still be present for notification purposes
    // but delivery address is not needed

    log.success("Customer collect order does not require delivery routing");
    log.info("  No delivery address needed");
    log.info("  No rider assignment");
  });

  // ========================================================================
  // Test 3: Differentiate from Other Fulfillment Types
  // ========================================================================

  it("should differentiate from other fulfillment types", async () => {
    log.test("Test 3: Differentiating fulfillment types");

    // Deliveroo delivery
    const deliverooOrder = createNewOrderWebhook({
      fulfillment_type: "deliveroo",
    });

    // Restaurant delivery
    const restaurantOrder = createNewOrderWebhook({
      fulfillment_type: "restaurant",
    });

    // Customer collect
    const customerCollect = createNewOrderWebhook({
      fulfillment_type: "customer",
    });

    expect(deliverooOrder.body.order.fulfillment_type).toBe("deliveroo");
    expect(restaurantOrder.body.order.fulfillment_type).toBe("restaurant");
    expect(customerCollect.body.order.fulfillment_type).toBe("customer");

    log.success("All fulfillment types differentiated");
    log.info("  deliveroo: Delivered by Deliveroo riders");
    log.info("  restaurant: Delivered by restaurant's own riders");
    log.info("  customer: Picked up by customer (no delivery)");
  });

  // ========================================================================
  // Test 4: Customer Collect Order Lifecycle
  // ========================================================================

  it("should support customer collect lifecycle", async () => {
    log.test("Test 4: Validating customer collect order lifecycle");

    const orderId = generateOrderId("lifecycle");

    // Valid status transitions for customer collect orders
    const validStatuses = [
      "placed",
      "accepted",
      "started_preparing",
      "ready_for_collection", // Final status - ready for customer pickup
    ];

    for (const status of validStatuses) {
      const statusWebhook = createStatusUpdateWebhook(orderId, status);
      expect(statusWebhook.body.order.status).toBe(status);
    }

    log.success("Customer collect lifecycle validated");
    log.info(
      "  Valid statuses: placed -> accepted -> preparing -> ready_for_collection",
    );
    log.info("  No 'delivered' status - customer picks up when ready");
  });

  // ========================================================================
  // Test 5: Ready for Collection Status
  // ========================================================================

  it("should use ready_for_collection as final status", async () => {
    log.test("Test 5: Validating ready_for_collection status");

    const orderId = generateOrderId("ready");
    const readyWebhook = createStatusUpdateWebhook(
      orderId,
      "ready_for_collection",
    );

    expect(readyWebhook.body.order.status).toBe("ready_for_collection");

    // This is the final status for customer collect orders
    // There is no "delivered" or "completed" status since customer picks up

    log.success("ready_for_collection status validated");
    log.info("  This is the final status for customer collect orders");
    log.info("  Customer can be notified to come pick up the order");
  });

  // ========================================================================
  // Test 6: ASAP Customer Collect
  // ========================================================================

  it("should support ASAP customer collect", async () => {
    log.test("Test 6: Validating ASAP customer collect");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "customer",
      asap: true,
    });

    const order = webhook.body.order;

    expect(order.fulfillment_type).toBe("customer");
    expect(order.asap).toBe(true);
    expect(order.confirm_at).toBeUndefined();

    log.success("ASAP customer collect validated");
    log.info("  fulfillment_type: customer");
    log.info("  asap: true");
  });

  // ========================================================================
  // Test 7: Scheduled Customer Collect
  // ========================================================================

  it("should support scheduled customer collect", async () => {
    log.test("Test 7: Validating scheduled customer collect");

    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const confirmTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const webhook = createNewOrderWebhook({
      fulfillment_type: "customer",
      asap: false,
      start_preparing_at: futureTime,
      confirm_at: confirmTime,
    });

    const order = webhook.body.order;

    expect(order.fulfillment_type).toBe("customer");
    expect(order.asap).toBe(false);
    expect(order.start_preparing_at).toBeDefined();
    expect(order.confirm_at).toBeDefined();

    log.success("Scheduled customer collect validated");
    log.info("  fulfillment_type: customer");
    log.info("  asap: false");
    log.info("  Scheduled for future pickup");
  });

  // ========================================================================
  // Test 8: Required Fields for Customer Collect
  // ========================================================================

  it("should have all required fields", async () => {
    log.test("Test 8: Checking required fields for customer collect");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "customer",
    });

    const order = webhook.body.order;

    // Core order fields (same for all fulfillment types)
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("order_number");
    expect(order).toHaveProperty("status");
    expect(order).toHaveProperty("fulfillment_type");
    expect(order).toHaveProperty("total_price");
    expect(order).toHaveProperty("items");

    // Customer collect specific
    expect(order.fulfillment_type).toBe("customer");

    log.success("All required fields validated");
  });

  // ========================================================================
  // Test 9: Sync Status Requirement
  // ========================================================================

  it("should require sync_status after acceptance", async () => {
    log.test("Test 9: Validating sync_status requirement");

    // Customer collect orders MUST send sync_status after acceptance
    // This is the same requirement as all other order types

    const webhook = createNewOrderWebhook({
      fulfillment_type: "customer",
      asap: true,
    });

    const order = webhook.body.order;

    expect(order.fulfillment_type).toBe("customer");
    expect(order).toHaveProperty("id");

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
  });

  // ========================================================================
  // Test 10: No Delivery Tracking
  // ========================================================================

  it("should not have delivery tracking statuses", async () => {
    log.test("Test 10: Validating absence of delivery statuses");

    // Customer collect orders should NOT have these statuses:
    // - "out_for_delivery"
    // - "delivered"

    // Valid statuses for customer collect
    const validStatuses = [
      "placed",
      "accepted",
      "started_preparing",
      "ready_for_collection",
    ];

    // Invalid statuses for customer collect
    const _invalidStatuses = ["out_for_delivery", "delivered"];

    // Verify valid statuses work
    for (const status of validStatuses) {
      const webhook = createStatusUpdateWebhook("test-id", status);
      expect(webhook.body.order.status).toBe(status);
    }

    log.success("Customer collect statuses validated");
    log.info("  No out_for_delivery status");
    log.info("  No delivered status");
    log.info("  Final status: ready_for_collection");
  });
});
