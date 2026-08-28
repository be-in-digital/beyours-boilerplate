/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 2: Remake Orders Tests  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 2: Remake Orders
 *
 * This scenario validates:
 * 1. Remake order creation with remake_details object
 * 2. Parent-child order relationship
 * 3. Fault attribution (deliveroo vs restaurant)
 * 4. Price calculation based on fault
 * 5. Sync status timing (wait for "accepted" webhook before sending)
 *
 * Scenarios 2 and 8 send actual webhooks to the Convex HTTP endpoint.
 *
 * @reference https://api-docs.deliveroo.com/docs/remake-orders
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertRemakeDetails,
  assertWebhookSuccess,
  config,
  createNewOrderWebhook,
  createRemakeOrderWebhook,
  createStatusUpdateWebhook,
  generateOrderId,
  hasWebhookTarget,
  log,
  sendWebhook,
  wait,
} from "./test-config";

const itWithWebhookTarget = it.runIf(hasWebhookTarget);

// ============================================================================
// Test Suite
// ============================================================================

describe("Scenario 2: Remake Orders", () => {
  let originalOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Remake Orders Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Remake Orders Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Original Order Creation
  // ========================================================================

  itWithWebhookTarget("should create original order successfully", async () => {
    log.test("Test 1: Creating original order");

    originalOrderId = generateOrderId("original");
    const webhook = createNewOrderWebhook({ id: originalOrderId });

    const response = await sendWebhook(webhook);
    const _result = await assertWebhookSuccess(response);

    log.success(`Original order created: ${originalOrderId}`);
  }, 10000);

  // ========================================================================
  // Test 2: Remake Order (Deliveroo Fault - Full Price)
  // ========================================================================

  itWithWebhookTarget("should create remake order with Deliveroo fault (full price)", async () => {
    log.test("Test 2: Creating remake order (Deliveroo fault)");

    const webhook = createRemakeOrderWebhook(originalOrderId, "deliveroo");
    const order = webhook.body.order;

    // Validate price before sending
    expect(order.total_price.fractional).toBe(2500); // Full price
    expect(order.remake_details.order_cost).toBe(2500);

    const response = await sendWebhook(webhook);
    await assertWebhookSuccess(response);

    // Validate remake_details
    assertRemakeDetails(order.remake_details, originalOrderId, "deliveroo");

    log.success(`Remake order (Deliveroo fault) created with full price`);
  }, 10000);

  // ========================================================================
  // Test 3: Remake Order (Restaurant Fault - Zero Price)
  // ========================================================================

  itWithWebhookTarget("should create remake order with Restaurant fault (zero price)", async () => {
    log.test("Test 3: Creating remake order (Restaurant fault)");

    const webhook = createRemakeOrderWebhook(originalOrderId, "restaurant");
    const order = webhook.body.order;

    // Validate price before sending
    expect(order.total_price.fractional).toBe(0); // Zero price
    expect(order.remake_details.order_cost).toBe(0);

    const response = await sendWebhook(webhook);
    await assertWebhookSuccess(response);

    // Validate remake_details
    assertRemakeDetails(order.remake_details, originalOrderId, "restaurant");

    log.success(`Remake order (Restaurant fault) created with zero price`);
  }, 10000);

  // ========================================================================
  // Test 4: Sync Status Timing (Wait for Accepted Webhook)
  // ========================================================================

  itWithWebhookTarget("should send sync_status AFTER receiving accepted webhook", async () => {
    log.test("Test 4: Testing sync_status timing");

    // Step 1: Create new remake order
    const remakeWebhook = createRemakeOrderWebhook(
      originalOrderId,
      "deliveroo",
    );
    const remakeOrderId = remakeWebhook.body.order.id;

    log.info(`Sending order.new webhook for ${remakeOrderId}`);
    const newOrderResponse = await sendWebhook(remakeWebhook);
    await assertWebhookSuccess(newOrderResponse);

    // Step 2: Wait for auto-accept (Deliveroo auto-accepts in sandbox, can take up to 10s)
    log.wait("Waiting 5s for Deliveroo auto-accept simulation...");
    await wait(5000);

    // Step 3: Send accepted webhook
    log.info("Sending order.status_update webhook (accepted)");
    const acceptedWebhook = createStatusUpdateWebhook(
      remakeOrderId,
      "accepted",
    );
    const acceptedResponse = await sendWebhook(acceptedWebhook);
    await assertWebhookSuccess(acceptedResponse);

    // Step 4: Wait for sync_status to be sent
    log.wait("Waiting 2s for sync_status to be sent...");
    await wait(2000);

    log.success("Sync status should have been sent after accepted webhook");
  }, 20000);

  // ========================================================================
  // Test 5: Multiple Remake Orders for Same Parent
  // ========================================================================

  itWithWebhookTarget("should handle multiple remake orders for same parent", async () => {
    log.test("Test 5: Creating multiple remake orders");

    // First remake
    const remake1 = createRemakeOrderWebhook(originalOrderId, "deliveroo");
    const response1 = await sendWebhook(remake1);
    await assertWebhookSuccess(response1);

    log.info(`First remake created: ${remake1.body.order.id}`);

    // Second remake
    const remake2 = createRemakeOrderWebhook(originalOrderId, "restaurant");
    const response2 = await sendWebhook(remake2);
    await assertWebhookSuccess(response2);

    log.info(`Second remake created: ${remake2.body.order.id}`);

    log.success("Multiple remake orders handled successfully");
  }, 15000);

  // ========================================================================
  // Test 6: Remake Details Validation
  // ========================================================================

  it("should validate remake_details object structure", async () => {
    log.test("Test 6: Validating remake_details structure");

    const webhook = createRemakeOrderWebhook(originalOrderId, "deliveroo");
    const remakeDetails = webhook.body.order.remake_details;

    // Required fields
    expect(remakeDetails).toHaveProperty("parent_order_id");
    expect(remakeDetails).toHaveProperty("fault");
    expect(remakeDetails).toHaveProperty("order_cost");

    // Fault must be either "deliveroo" or "restaurant"
    expect(["deliveroo", "restaurant"]).toContain(remakeDetails.fault);

    // parent_order_id must match original order
    expect(remakeDetails.parent_order_id).toBe(originalOrderId);

    log.success("Remake details validation passed");
  });

  // ========================================================================
  // Test 7: Price Calculation Based on Fault
  // ========================================================================

  it("should calculate prices correctly based on fault", async () => {
    log.test("Test 7: Validating price calculation");

    // Deliveroo fault = 100% price
    const deliverooFault = createRemakeOrderWebhook(
      originalOrderId,
      "deliveroo",
    );
    const deliverooOrder = deliverooFault.body.order;
    expect(deliverooOrder.total_price.fractional).toBe(2500);
    expect(deliverooOrder.remake_details.order_cost).toBe(2500);
    log.info("Deliveroo fault: 100% price");

    // Restaurant fault = 0% price
    const restaurantFault = createRemakeOrderWebhook(
      originalOrderId,
      "restaurant",
    );
    const restaurantOrder = restaurantFault.body.order;
    expect(restaurantOrder.total_price.fractional).toBe(0);
    expect(restaurantOrder.remake_details.order_cost).toBe(0);
    log.info("Restaurant fault: 0% price");

    log.success("Price calculation validation passed");
  });

  // ========================================================================
  // Test 8: Order Flow Validation
  // ========================================================================

  itWithWebhookTarget("should follow complete remake order flow", async () => {
    log.test("Test 8: Testing complete remake flow");

    // Create remake order
    const remake = createRemakeOrderWebhook(originalOrderId, "deliveroo");
    const remakeId = remake.body.order.id;

    // Step 1: order.new
    log.info("Step 1: Sending order.new");
    await assertWebhookSuccess(await sendWebhook(remake));

    // Step 2: Wait for auto-accept
    log.wait("Step 2: Waiting for auto-accept...");
    await wait(3000);

    // Step 3: order.status_update (accepted)
    log.info("Step 3: Sending order.status_update (accepted)");
    await assertWebhookSuccess(
      await sendWebhook(createStatusUpdateWebhook(remakeId, "accepted")),
    );

    // Step 4: order.status_update (started_preparing)
    log.info("Step 4: Sending order.status_update (started_preparing)");
    await assertWebhookSuccess(
      await sendWebhook(
        createStatusUpdateWebhook(remakeId, "started_preparing"),
      ),
    );

    // Step 5: order.status_update (ready_for_collection)
    log.info("Step 5: Sending order.status_update (ready_for_collection)");
    await assertWebhookSuccess(
      await sendWebhook(
        createStatusUpdateWebhook(remakeId, "ready_for_collection"),
      ),
    );

    log.success("Complete remake flow validated");
  }, 30000);
});
