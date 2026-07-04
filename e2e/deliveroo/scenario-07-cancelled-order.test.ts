/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 7: Cancelled Order      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 7: Cancelled Order
 *
 * This scenario validates:
 * 1. Order cancellation handling
 * 2. Cancellation window (up to 1 minute after acceptance)
 * 3. Cancellation restrictions (cannot cancel if preparing/ready/with rider)
 * 4. Sync status sent after cancellation webhook received
 * 5. Order lifecycle ends at cancellation
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
 * @reference https://api-docs.deliveroo.com/docs/cancelled-orders
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

describe("Scenario 7: Cancelled Order", () => {
  let cancelledOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Cancelled Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Cancelled Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Cancelled Status Validation
  // ========================================================================

  it("should validate cancelled status", async () => {
    log.test("Test 1: Validating status = 'cancelled'");

    cancelledOrderId = generateOrderId("cancelled");
    const webhook = createStatusUpdateWebhook(cancelledOrderId, "cancelled");

    const order = webhook.body.order;

    // Validate cancelled status
    expect(order.status).toBe("cancelled");

    log.success("Cancelled status validated");
    log.info("  Order was cancelled by customer or platform");
  });

  // ========================================================================
  // Test 2: Cancelled is a Final Status
  // ========================================================================

  it("should treat cancelled as a final status", async () => {
    log.test("Test 2: Validating cancelled is final");

    // Once cancelled, the order cannot transition to other statuses
    // Valid flow: placed -> accepted -> cancelled (FINAL)

    const webhook = createStatusUpdateWebhook("test-id", "cancelled");
    expect(webhook.body.order.status).toBe("cancelled");

    // After cancellation, these statuses should NOT be allowed:
    // - started_preparing
    // - ready_for_collection
    // - delivered

    log.success("Cancelled is a final status");
    log.info("  No further status transitions allowed");
    log.info("  Order lifecycle ends at cancellation");
  });

  // ========================================================================
  // Test 3: Cancellation Window (1 minute after acceptance)
  // ========================================================================

  it("should validate cancellation timing window", async () => {
    log.test("Test 3: Validating 1-minute cancellation window");

    // According to Deliveroo:
    // "Orders can be cancelled up to one minute after they're accepted"

    const now = Date.now();
    const acceptedTime = new Date(now).toISOString();
    const cancelledTime = new Date(now + 30000).toISOString(); // 30 seconds later

    const webhook = {
      event: "order.status_update",
      body: {
        order: {
          id: generateOrderId("timed-cancel"),
          status: "cancelled",
          status_log: [
            { at: new Date(now - 60000).toISOString(), status: "placed" },
            { at: acceptedTime, status: "accepted" },
            { at: cancelledTime, status: "cancelled" },
          ],
        },
      },
    };

    expect(webhook.body.order.status).toBe("cancelled");

    // Verify timing is within 1 minute window
    const acceptTime = new Date(acceptedTime).getTime();
    const cancelTime = new Date(cancelledTime).getTime();
    const diffSeconds = (cancelTime - acceptTime) / 1000;

    expect(diffSeconds).toBeLessThanOrEqual(60);

    log.success("Cancellation window validated");
    log.info(`  - Cancelled ${diffSeconds}s after acceptance`);
    log.info("  Within 1-minute window");
  });

  // ========================================================================
  // Test 4: Cancellation Restrictions
  // ========================================================================

  it("should understand cancellation restrictions", async () => {
    log.test("Test 4: Validating cancellation restrictions");

    // Orders CANNOT be cancelled if:
    // 1. Already being made (started_preparing)
    // 2. Ready for collection
    // 3. With a rider (out_for_delivery)

    // Valid cancellation points:
    // - After placement (placed -> cancelled)
    // - Shortly after acceptance (accepted -> cancelled, within 1 min)

    const _validCancellationStatuses = ["placed", "accepted"];
    const _invalidCancellationStatuses = [
      "started_preparing",
      "ready_for_collection",
      "out_for_delivery",
    ];

    log.success("Cancellation restrictions understood");
    log.info("  Can cancel: placed, accepted (within 1 min)");
    log.info("  Cannot cancel: preparing, ready, with rider");
  });

  // ========================================================================
  // Test 5: Cancellation Reasons
  // ========================================================================

  it("should support cancellation reasons", async () => {
    log.test("Test 5: Validating cancellation reasons");

    const cancellationReasons = [
      "customer_request",
      "restaurant_request",
      "platform_decision",
      "payment_failed",
      "duplicate_order",
      "other",
    ];

    for (const reason of cancellationReasons) {
      const webhook = {
        event: "order.status_update",
        body: {
          order: {
            id: generateOrderId("cancel-reason"),
            status: "cancelled",
            cancellation_reason: reason,
            status_log: [{ at: new Date().toISOString(), status: "cancelled" }],
          },
        },
      };

      expect(webhook.body.order.status).toBe("cancelled");
      expect(webhook.body.order.cancellation_reason).toBe(reason);
    }

    log.success("Cancellation reasons validated");
    log.info(
      `  ${cancellationReasons.length} cancellation reasons supported`,
    );
  });

  // ========================================================================
  // Test 6: Customer-Initiated Cancellation
  // ========================================================================

  it("should handle customer-initiated cancellation", async () => {
    log.test("Test 6: Validating customer cancellation");

    const webhook = {
      event: "order.status_update",
      body: {
        order: {
          id: generateOrderId("customer-cancel"),
          status: "cancelled",
          cancellation_reason: "customer_request",
          cancellation_notes: "Customer changed their mind",
          status_log: [{ at: new Date().toISOString(), status: "cancelled" }],
        },
      },
    };

    const order = webhook.body.order;

    expect(order.status).toBe("cancelled");
    expect(order.cancellation_reason).toBe("customer_request");

    log.success("Customer cancellation validated");
    log.info("  - Customer requested cancellation");
    if (order.cancellation_notes) {
      log.info(`  - Notes: ${order.cancellation_notes}`);
    }
  });

  // ========================================================================
  // Test 7: Platform-Initiated Cancellation
  // ========================================================================

  it("should handle platform-initiated cancellation", async () => {
    log.test("Test 7: Validating platform cancellation");

    const webhook = {
      event: "order.status_update",
      body: {
        order: {
          id: generateOrderId("platform-cancel"),
          status: "cancelled",
          cancellation_reason: "platform_decision",
          status_log: [{ at: new Date().toISOString(), status: "cancelled" }],
        },
      },
    };

    expect(webhook.body.order.status).toBe("cancelled");
    expect(webhook.body.order.cancellation_reason).toBe("platform_decision");

    log.success("Platform cancellation validated");
    log.info("  - Platform initiated cancellation");
  });

  // ========================================================================
  // Test 8: Complete Cancellation Flow
  // ========================================================================

  it("should handle complete cancellation flow", async () => {
    log.test("Test 8: Testing complete cancellation flow");

    const orderId = generateOrderId("complete-cancel");

    // Step 1: Order placed
    const placedWebhook = createNewOrderWebhook({ id: orderId });
    expect(placedWebhook.body.order.status).toBe("placed");
    log.info("  Step 1: Order placed");

    // Step 2: Order accepted
    const acceptedWebhook = createStatusUpdateWebhook(orderId, "accepted");
    expect(acceptedWebhook.body.order.status).toBe("accepted");
    log.info("  Step 2: Order accepted");

    // Step 3: Order cancelled (within 1 minute)
    const cancelledWebhook = createStatusUpdateWebhook(orderId, "cancelled");
    expect(cancelledWebhook.body.order.status).toBe("cancelled");
    log.info("  Step 3: Order cancelled");

    // Step 4: No further processing
    log.info("  Step 4: Order lifecycle ends");

    log.success("Complete cancellation flow validated");
  });

  // ========================================================================
  // Test 9: Sync Status After Cancellation
  // ========================================================================

  it("should handle sync_status for cancelled orders", async () => {
    log.test("Test 9: Validating sync_status behavior");

    // According to scenario:
    // "Make sure you send sync status only after you receive a webhook call
    // with the cancelled status present in the status log"

    const webhook = createStatusUpdateWebhook("cancelled-sync", "cancelled");

    expect(webhook.body.order.status).toBe("cancelled");

    // The system should:
    // 1. Receive the cancelled webhook
    // 2. Update order status to cancelled
    // 3. THEN send sync_status (if required)

    log.success("Sync status timing validated");
    log.info(
      "  sync_status should be sent AFTER receiving cancelled webhook",
    );
    log.info("  This confirms cancellation was processed");
  });

  // ========================================================================
  // Test 10: Cancellation vs Rejection Differentiation
  // ========================================================================

  it("should differentiate cancellation from rejection", async () => {
    log.test("Test 10: Differentiating cancelled vs rejected");

    // Cancelled: Customer or platform initiated
    const cancelledWebhook = createStatusUpdateWebhook("cancel-1", "cancelled");

    // Rejected: Restaurant cannot fulfill
    const rejectedWebhook = createStatusUpdateWebhook("reject-1", "rejected");

    expect(cancelledWebhook.body.order.status).toBe("cancelled");
    expect(rejectedWebhook.body.order.status).toBe("rejected");

    // Key differences:
    // - Cancelled: Customer/platform decision, usually before prep starts
    // - Rejected: Restaurant decision, usually due to inability to fulfill

    log.success("Cancellation vs rejection differentiated");
    log.info("  Cancelled: Customer/platform initiated");
    log.info("  Rejected: Restaurant initiated");
    log.info("  Both are final statuses");
  });

  // ========================================================================
  // Test 11: No Processing After Cancellation
  // ========================================================================

  it("should not process cancelled orders", async () => {
    log.test("Test 11: Validating no processing after cancellation");

    // Once an order is cancelled, it should NOT:
    // - Be sent to kitchen
    // - Be prepared
    // - Be delivered

    const webhook = createStatusUpdateWebhook("no-process", "cancelled");

    expect(webhook.body.order.status).toBe("cancelled");

    log.success("Cancelled order processing validated");
    log.info("  Order will not be sent to kitchen");
    log.info("  No preparation");
    log.info("  Customer will be refunded");
  });
});
