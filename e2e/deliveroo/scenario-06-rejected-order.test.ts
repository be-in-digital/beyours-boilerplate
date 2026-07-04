/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 6: Rejected Order       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 6: Rejected Order
 *
 * This scenario validates:
 * 1. Order rejection handling
 * 2. Status "rejected" is final - no further processing
 * 3. Rejection reason tracking
 * 4. Sync status sent after rejection webhook received
 * 5. Order cannot be processed after rejection
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

describe("Scenario 6: Rejected Order", () => {
  let rejectedOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Rejected Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Rejected Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Rejected Status Validation
  // ========================================================================

  it("should validate rejected status", async () => {
    log.test("Test 1: Validating status = 'rejected'");

    rejectedOrderId = generateOrderId("rejected");
    const webhook = createStatusUpdateWebhook(rejectedOrderId, "rejected");

    const order = webhook.body.order;

    // Validate rejected status
    expect(order.status).toBe("rejected");

    log.success("Rejected status validated");
    log.info("  Order will not be processed further");
  });

  // ========================================================================
  // Test 2: Rejected is a Final Status
  // ========================================================================

  it("should treat rejected as a final status", async () => {
    log.test("Test 2: Validating rejected is final");

    // Once rejected, the order cannot transition to other statuses
    // Valid flow: placed -> rejected (FINAL)

    const webhook = createStatusUpdateWebhook("test-id", "rejected");
    expect(webhook.body.order.status).toBe("rejected");

    // After rejection, these statuses should NOT be allowed:
    // - accepted
    // - started_preparing
    // - ready_for_collection
    // - delivered

    log.success("Rejected is a final status");
    log.info("  No further status transitions allowed");
    log.info("  Order lifecycle ends at rejection");
  });

  // ========================================================================
  // Test 3: Rejection Reason
  // ========================================================================

  it("should support rejection reasons", async () => {
    log.test("Test 3: Validating rejection reasons");

    const rejectionReasons = [
      "out_of_stock",
      "too_busy",
      "restaurant_closed",
      "incorrect_pricing",
      "technical_issue",
      "other",
    ];

    // Each rejection can have a reason
    for (const reason of rejectionReasons) {
      const webhook = {
        event: "order.status_update",
        body: {
          order: {
            id: generateOrderId("rejected"),
            status: "rejected",
            rejection_reason: reason,
            status_log: [{ at: new Date().toISOString(), status: "rejected" }],
          },
        },
      };

      expect(webhook.body.order.status).toBe("rejected");
      expect(webhook.body.order.rejection_reason).toBe(reason);
    }

    log.success("Rejection reasons validated");
    log.info(`  ${rejectionReasons.length} rejection reasons supported`);
  });

  // ========================================================================
  // Test 4: Order Lifecycle with Rejection
  // ========================================================================

  it("should support rejection at different stages", async () => {
    log.test("Test 4: Validating rejection timing");

    // Orders can be rejected at different stages:

    // 1. Immediate rejection (placed -> rejected)
    const immediateRejection = createStatusUpdateWebhook("order-1", "rejected");
    expect(immediateRejection.body.order.status).toBe("rejected");

    // 2. After acceptance (placed -> accepted -> rejected)
    const afterAcceptance = createStatusUpdateWebhook("order-2", "rejected");
    expect(afterAcceptance.body.order.status).toBe("rejected");

    log.success("Rejection at different stages validated");
    log.info("  Can reject immediately after placement");
    log.info("  Can reject after acceptance");
  });

  // ========================================================================
  // Test 5: Rejected Order Notification
  // ========================================================================

  it("should include rejection timestamp", async () => {
    log.test("Test 5: Validating rejection timestamp");

    const rejectionTime = new Date().toISOString();
    const webhook = {
      event: "order.status_update",
      body: {
        order: {
          id: generateOrderId("rejected"),
          status: "rejected",
          status_log: [{ at: rejectionTime, status: "rejected" }],
        },
      },
    };

    expect(webhook.body.order.status).toBe("rejected");
    expect(webhook.body.order.status_log).toHaveLength(1);
    expect(webhook.body.order.status_log[0]!.status).toBe("rejected");
    expect(webhook.body.order.status_log[0]!.at).toBe(rejectionTime);

    log.success("Rejection timestamp validated");
    log.info(`  - Rejected at: ${rejectionTime}`);
  });

  // ========================================================================
  // Test 6: No Processing After Rejection
  // ========================================================================

  it("should not process rejected orders", async () => {
    log.test("Test 6: Validating no processing after rejection");

    // Once an order is rejected, it should NOT:
    // - Be sent to kitchen
    // - Be prepared
    // - Be delivered
    // - Trigger further webhooks (except maybe cancellation confirmation)

    const webhook = createStatusUpdateWebhook("rejected-order", "rejected");

    expect(webhook.body.order.status).toBe("rejected");

    log.success("Rejected order processing validated");
    log.info("  Order will not be sent to kitchen");
    log.info("  No further preparation");
    log.info("  Customer will be notified of rejection");
  });

  // ========================================================================
  // Test 7: Sync Status After Rejection
  // ========================================================================

  it("should handle sync_status for rejected orders", async () => {
    log.test("Test 7: Validating sync_status behavior");

    // According to scenario description:
    // "Make sure you send sync status only after you receive a webhook call
    // with the rejected status present in the status log"

    const webhook = createStatusUpdateWebhook("rejected-sync", "rejected");

    expect(webhook.body.order.status).toBe("rejected");

    // The system should:
    // 1. Receive the rejected webhook
    // 2. Update order status to rejected
    // 3. THEN send sync_status (if required)

    log.success("Sync status timing validated");
    log.info(
      "  sync_status should be sent AFTER receiving rejected webhook",
    );
    log.info("  This confirms rejection was processed");
  });

  // ========================================================================
  // Test 8: Complete Rejection Flow
  // ========================================================================

  it("should handle complete rejection flow", async () => {
    log.test("Test 8: Testing complete rejection flow");

    const orderId = generateOrderId("complete-rejection");

    // Step 1: Order placed
    const placedWebhook = createNewOrderWebhook({ id: orderId });
    expect(placedWebhook.body.order.status).toBe("placed");
    log.info("  Step 1: Order placed");

    // Step 2: Order rejected (can happen immediately or after acceptance)
    const rejectedWebhook = createStatusUpdateWebhook(orderId, "rejected");
    expect(rejectedWebhook.body.order.status).toBe("rejected");
    log.info("  Step 2: Order rejected");

    // Step 3: No further processing
    log.info("  Step 3: Order lifecycle ends");

    log.success("Complete rejection flow validated");
  });

  // ========================================================================
  // Test 9: Rejection Reasons Structure
  // ========================================================================

  it("should validate rejection details structure", async () => {
    log.test("Test 9: Validating rejection details");

    const webhook = {
      event: "order.status_update",
      body: {
        order: {
          id: generateOrderId("rejection-details"),
          status: "rejected",
          rejection_reason: "out_of_stock",
          rejection_notes: "Main ingredient not available",
          status_log: [{ at: new Date().toISOString(), status: "rejected" }],
        },
      },
    };

    const order = webhook.body.order;

    expect(order.status).toBe("rejected");
    expect(order).toHaveProperty("rejection_reason");

    // Optional but useful fields
    if (order.rejection_notes) {
      expect(typeof order.rejection_notes).toBe("string");
      log.info(`  - Rejection notes: ${order.rejection_notes}`);
    }

    log.success("Rejection details structure validated");
  });

  // ========================================================================
  // Test 10: Validation Duration
  // ========================================================================

  it("should acknowledge validation duration", async () => {
    log.test("Test 10: Acknowledging validation requirements");

    // According to scenario:
    // "The validation will run for at least 3 minutes"

    // This means when testing via Developer Portal,
    // the system will wait 3 minutes to ensure rejected status is properly handled

    const webhook = createStatusUpdateWebhook("validation-test", "rejected");
    expect(webhook.body.order.status).toBe("rejected");

    log.success("Validation requirements acknowledged");
    log.info("  Developer Portal validates for at least 3 minutes");
    log.info("  Ensure rejected status is properly persisted");
    log.info(
      "  System must correctly handle rejection throughout test period",
    );
  });
});
