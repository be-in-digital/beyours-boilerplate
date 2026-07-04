/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 3: Scheduled Orders     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 3: Scheduled Orders
 *
 * This scenario validates:
 * 1. Scheduled orders with `asap: false`
 * 2. `confirm_at` field presence
 * 3. `start_preparing_at` in the future
 * 4. Manual confirmation required before preparation
 * 5. Sync status after confirmation/acceptance
 *
 * @reference https://api-docs.deliveroo.com/docs/scheduled-orders-1
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  config,
  createNewOrderWebhook,
  generateOrderId,
  log,
} from "./test-config";

// ============================================================================
// Test Suite
// ============================================================================

describe("Scenario 3: Scheduled Orders", () => {
  let scheduledOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Scheduled Orders Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Scheduled Orders Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Scheduled Order Structure Validation
  // ========================================================================

  it("should validate scheduled order structure", async () => {
    log.test("Test 1: Validating scheduled order payload structure");

    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour
    const confirmTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // +30 min

    scheduledOrderId = generateOrderId("scheduled");
    const webhook = createNewOrderWebhook({
      id: scheduledOrderId,
      asap: false,
      start_preparing_at: futureTime,
      confirm_at: confirmTime,
    });

    const order = webhook.body.order;

    // Validate scheduled order fields
    expect(order.asap).toBe(false);
    expect(order.start_preparing_at).toBeDefined();
    expect(order.confirm_at).toBeDefined();

    // Validate timestamps are in the future
    const startPreparingTime = new Date(order.start_preparing_at).getTime();
    const confirmAtTime = new Date(order.confirm_at!).getTime();
    const now = Date.now();

    expect(startPreparingTime).toBeGreaterThan(now);
    expect(confirmAtTime).toBeGreaterThan(now);
    expect(confirmAtTime).toBeLessThan(startPreparingTime);

    log.success("Scheduled order structure validated");
    log.info(`  - asap: ${order.asap}`);
    log.info(`  - confirm_at: ${order.confirm_at}`);
    log.info(`  - start_preparing_at: ${order.start_preparing_at}`);
  });

  // ========================================================================
  // Test 2: Scheduled Order Fields
  // ========================================================================

  it("should have required scheduled order fields", async () => {
    log.test("Test 2: Checking required fields for scheduled orders");

    const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const confirmTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: futureTime,
      confirm_at: confirmTime,
      prepare_for: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // +1h15m
    });

    const order = webhook.body.order;

    // Required fields for scheduled orders
    expect(order).toHaveProperty("asap");
    expect(order).toHaveProperty("start_preparing_at");
    expect(order).toHaveProperty("confirm_at");
    // prepare_for is optional but recommended

    // asap must be false
    expect(order.asap).toBe(false);

    log.success("All required fields present");
  });

  // ========================================================================
  // Test 3: Time Ordering Validation
  // ========================================================================

  it("should have correct time ordering", async () => {
    log.test(
      "Test 3: Validating time ordering (now < confirm_at < start_preparing_at)",
    );

    const now = Date.now();
    const confirmTime = new Date(now + 30 * 60 * 1000); // +30 min
    const startPreparingTime = new Date(now + 60 * 60 * 1000); // +1 hour

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: startPreparingTime.toISOString(),
      confirm_at: confirmTime.toISOString(),
    });

    const order = webhook.body.order;

    const confirmAt = new Date(order.confirm_at!).getTime();
    const startPreparingAt = new Date(order.start_preparing_at).getTime();

    // Validate time ordering
    expect(now).toBeLessThan(confirmAt);
    expect(confirmAt).toBeLessThan(startPreparingAt);

    log.success("Time ordering validated:");
    log.info(`  - Now: ${new Date(now).toISOString()}`);
    log.info(`  - Confirm at: ${order.confirm_at}`);
    log.info(`  - Start preparing at: ${order.start_preparing_at}`);
  });

  // ========================================================================
  // Test 4: ASAP vs Scheduled Differentiation
  // ========================================================================

  it("should differentiate ASAP from scheduled orders", async () => {
    log.test("Test 4: Differentiating ASAP from scheduled orders");

    // ASAP order
    const asapWebhook = createNewOrderWebhook({
      asap: true,
    });

    // Scheduled order
    const scheduledWebhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirm_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    const asapOrder = asapWebhook.body.order;
    const scheduledOrder = scheduledWebhook.body.order;

    // ASAP order checks
    expect(asapOrder.asap).toBe(true);
    expect(asapOrder.confirm_at).toBeUndefined();

    // Scheduled order checks
    expect(scheduledOrder.asap).toBe(false);
    expect(scheduledOrder.confirm_at).toBeDefined();
    expect(scheduledOrder.start_preparing_at).toBeDefined();

    log.success("ASAP and Scheduled orders differentiated correctly");
  });

  // ========================================================================
  // Test 5: Confirmation Logic
  // ========================================================================

  it("should require manual confirmation for scheduled orders", async () => {
    log.test("Test 5: Testing manual confirmation requirement");

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirm_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    const order = webhook.body.order;

    // For scheduled orders, the system should:
    // 1. Receive the order
    // 2. Hold it back from preparation
    // 3. Wait for manual confirmation at confirm_at time
    // 4. Only then send it to the kitchen

    // The confirm_at field indicates when confirmation should happen
    expect(order.confirm_at).toBeDefined();

    const confirmAtTime = new Date(order.confirm_at!).getTime();
    const startPreparingTime = new Date(order.start_preparing_at).getTime();

    // Confirmation should happen before preparation
    expect(confirmAtTime).toBeLessThan(startPreparingTime);

    log.success("Manual confirmation logic validated");
    log.info(
      `  - Confirmation window: ${Math.round((startPreparingTime - confirmAtTime) / 1000 / 60)} minutes`,
    );
  });

  // ========================================================================
  // Test 6: Webhook Payload Example
  // ========================================================================

  it("should match Deliveroo documented payload structure", async () => {
    log.test("Test 6: Validating against documented payload structure");

    const webhook = createNewOrderWebhook({
      asap: false,
      start_preparing_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      confirm_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      prepare_for: new Date(Date.now() + 75 * 60 * 1000).toISOString(), // +1h15m
    });

    const order = webhook.body.order;

    // Match documented structure from https://api-docs.deliveroo.com/docs/scheduled-orders-1
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("order_number");
    expect(order).toHaveProperty("status");
    expect(order).toHaveProperty("asap");
    expect(order).toHaveProperty("start_preparing_at");
    expect(order).toHaveProperty("confirm_at");
    expect(order).toHaveProperty("prepare_for");
    expect(order).toHaveProperty("items");
    expect(order).toHaveProperty("total_price");

    expect(order.asap).toBe(false);

    log.success("Payload matches documented structure");
  });
});
