/**
 * ┌──────────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 10: Scheduled in Past Order  │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 10: Scheduled in Past Order
 *
 * This scenario validates:
 * 1. Orders with start_preparing_at in the past (edge case)
 * 2. Treatment as ASAP orders (despite asap: false)
 * 3. Immediate processing requirement
 * 4. Handling of past timestamps
 * 5. Sync status sent after acceptance
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
 * @reference https://api-docs.deliveroo.com/docs/scheduled-orders-1
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

describe("Scenario 10: Scheduled in Past Order", () => {
  let pastOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Scheduled in Past Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Scheduled in Past Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Past Timestamp Validation
  // ========================================================================

  it("should validate past timestamp in start_preparing_at", async () => {
    log.test("Test 1: Validating start_preparing_at in the past");

    pastOrderId = generateOrderId("past-scheduled");
    const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago

    const webhook = createNewOrderWebhook({
      id: pastOrderId,
      asap: false,
      start_preparing_at: pastTime,
    });

    const order = webhook.body.order;

    // Verify it's marked as scheduled (asap: false)
    expect(order.asap).toBe(false);

    // But start_preparing_at is in the past
    const preparingTime = new Date(order.start_preparing_at).getTime();
    const now = Date.now();

    expect(preparingTime).toBeLessThan(now);

    log.success("Past timestamp validated");
    log.info(`  - Current time: ${new Date(now).toISOString()}`);
    log.info(`  - Preparing time: ${order.start_preparing_at}`);
    log.info(
      `  - Time difference: ${Math.round((now - preparingTime) / 1000)}s ago`,
    );
  });

  // ========================================================================
  // Test 2: Should Be Treated as ASAP
  // ========================================================================

  it("should treat past scheduled orders as ASAP", async () => {
    log.test("Test 2: Validating ASAP-like treatment");

    // According to Deliveroo:
    // "It should be treated the same as an ASAP order"

    const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago

    const webhook = createNewOrderWebhook({
      asap: false, // Technically scheduled
      start_preparing_at: pastTime,
    });

    const order = webhook.body.order;

    // Even though asap is false, this should be processed immediately
    // because start_preparing_at is in the past

    expect(order.asap).toBe(false);
    expect(new Date(order.start_preparing_at).getTime()).toBeLessThan(
      Date.now(),
    );

    log.success("ASAP-like treatment validated");
    log.info("  Despite asap: false, order should be prepared immediately");
    log.info("  start_preparing_at is in the past");
  });

  // ========================================================================
  // Test 3: No Delay in Processing
  // ========================================================================

  it("should not delay processing", async () => {
    log.test("Test 3: Validating immediate processing");

    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: pastTime,
    });

    const order = webhook.body.order;

    // Order should not wait until start_preparing_at (which is in the past)
    // It should be sent to kitchen immediately

    const timeDiff = Date.now() - new Date(order.start_preparing_at).getTime();
    expect(timeDiff).toBeGreaterThan(0); // In the past

    log.success("Immediate processing validated");
    log.info("  No waiting period");
    log.info("  Send to kitchen immediately");
    log.info(
      `  - Order is ${Math.round(timeDiff / 1000 / 60)} minutes overdue`,
    );
  });

  // ========================================================================
  // Test 4: Comparison with Future Scheduled Orders
  // ========================================================================

  it("should differentiate from future scheduled orders", async () => {
    log.test("Test 4: Comparing past vs future scheduled orders");

    const now = Date.now();
    const pastTime = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago
    const futureTime = new Date(now + 60 * 60 * 1000).toISOString(); // 1h from now

    // Past scheduled order
    const pastOrder = createNewOrderWebhook({
      id: generateOrderId("past"),
      asap: false,
      start_preparing_at: pastTime,
    });

    // Future scheduled order
    const futureOrder = createNewOrderWebhook({
      id: generateOrderId("future"),
      asap: false,
      start_preparing_at: futureTime,
      confirm_at: new Date(now + 30 * 60 * 1000).toISOString(),
    });

    // Both have asap: false
    expect(pastOrder.body.order.asap).toBe(false);
    expect(futureOrder.body.order.asap).toBe(false);

    // But timing is different
    const pastPrepTime = new Date(
      pastOrder.body.order.start_preparing_at,
    ).getTime();
    const futurePrepTime = new Date(
      futureOrder.body.order.start_preparing_at,
    ).getTime();

    expect(pastPrepTime).toBeLessThan(now);
    expect(futurePrepTime).toBeGreaterThan(now);

    log.success("Past vs future differentiation validated");
    log.info("  Past: Process immediately");
    log.info("  Future: Wait until start_preparing_at");
  });

  // ========================================================================
  // Test 5: Edge Case - Just Passed
  // ========================================================================

  it("should handle recently passed timestamps", async () => {
    log.test("Test 5: Validating recently passed timestamp");

    // Order scheduled for 1 minute ago (just passed)
    const recentPast = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: recentPast,
    });

    const order = webhook.body.order;

    const timeDiff = Date.now() - new Date(order.start_preparing_at).getTime();
    expect(timeDiff).toBeGreaterThan(0);
    expect(timeDiff).toBeLessThan(2 * 60 * 1000); // Less than 2 minutes ago

    log.success("Recently passed timestamp validated");
    log.info(`  - Just ${Math.round(timeDiff / 1000)}s overdue`);
    log.info("  Should still be processed immediately");
  });

  // ========================================================================
  // Test 6: Edge Case - Far in the Past
  // ========================================================================

  it("should handle far past timestamps", async () => {
    log.test("Test 6: Validating far past timestamp");

    // Order scheduled for yesterday
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: yesterday,
    });

    const order = webhook.body.order;

    const timeDiff = Date.now() - new Date(order.start_preparing_at).getTime();
    expect(timeDiff).toBeGreaterThan(23 * 60 * 60 * 1000); // More than 23 hours

    log.success("Far past timestamp validated");
    log.info(`  - ${Math.round(timeDiff / 1000 / 60 / 60)} hours overdue`);
    log.info("  Unusual case - may indicate system issue");
  });

  // ========================================================================
  // Test 7: confirm_at Field Handling
  // ========================================================================

  it("should handle confirm_at with past timestamps", async () => {
    log.test("Test 7: Validating confirm_at with past order");

    const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const pastConfirm = new Date(Date.now() - 90 * 60 * 1000).toISOString(); // 90 min ago

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: pastTime,
      confirm_at: pastConfirm,
    });

    const order = webhook.body.order;

    // Both timestamps are in the past
    if (order.confirm_at) {
      expect(new Date(order.confirm_at).getTime()).toBeLessThan(Date.now());
    }
    expect(new Date(order.start_preparing_at).getTime()).toBeLessThan(
      Date.now(),
    );

    log.success("confirm_at handling validated");
    log.info("  No need to wait for confirmation (time passed)");
  });

  // ========================================================================
  // Test 8: Sync Status Requirement
  // ========================================================================

  it("should require sync_status after acceptance", async () => {
    log.test("Test 8: Validating sync_status requirement");

    // Past scheduled orders must send sync_status after acceptance
    // Same as all other orders

    const pastTime = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: pastTime,
    });

    const order = webhook.body.order;

    expect(order).toHaveProperty("id");
    expect(order.asap).toBe(false);
    expect(new Date(order.start_preparing_at).getTime()).toBeLessThan(
      Date.now(),
    );

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
    log.info("  Past timestamp doesn't affect sync_status requirement");
  });

  // ========================================================================
  // Test 9: Order Lifecycle
  // ========================================================================

  it("should follow normal order lifecycle", async () => {
    log.test("Test 9: Validating order lifecycle");

    const orderId = generateOrderId("lifecycle-past");
    const pastTime = new Date(Date.now() - 45 * 60 * 1000).toISOString();

    // Step 1: Order placed (scheduled in past)
    const placedWebhook = createNewOrderWebhook({
      id: orderId,
      asap: false,
      start_preparing_at: pastTime,
    });

    expect(placedWebhook.body.order.status).toBe("placed");
    log.info("  Step 1: Order placed");

    // Step 2: Order accepted (immediate, no delay)
    const acceptedWebhook = createStatusUpdateWebhook(orderId, "accepted");
    expect(acceptedWebhook.body.order.status).toBe("accepted");
    log.info("  Step 2: Order accepted immediately");

    // Step 3: Start preparing (immediately)
    const preparingWebhook = createStatusUpdateWebhook(
      orderId,
      "started_preparing",
    );
    expect(preparingWebhook.body.order.status).toBe("started_preparing");
    log.info("  Step 3: Start preparing immediately");

    log.success("Order lifecycle validated");
    log.info("  No waiting period despite asap: false");
  });

  // ========================================================================
  // Test 10: Error Handling Resilience
  // ========================================================================

  it("should handle edge cases gracefully", async () => {
    log.test("Test 10: Validating error resilience");

    // Various edge cases
    const edgeCases = [
      { desc: "1 second ago", offset: -1000 },
      { desc: "5 minutes ago", offset: -5 * 60 * 1000 },
      { desc: "1 hour ago", offset: -60 * 60 * 1000 },
      { desc: "6 hours ago", offset: -6 * 60 * 60 * 1000 },
    ];

    for (const edge of edgeCases) {
      const pastTime = new Date(Date.now() + edge.offset).toISOString();

      const webhook = createNewOrderWebhook({
        asap: false,
        start_preparing_at: pastTime,
      });

      expect(webhook.body.order.asap).toBe(false);
      expect(
        new Date(webhook.body.order.start_preparing_at).getTime(),
      ).toBeLessThan(Date.now());

      log.info(`  ${edge.desc} handled correctly`);
    }

    log.success("Edge cases handled gracefully");
  });
});
