// @vitest-environment edge-runtime

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 2: Remake Orders Tests   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Deliveroo's certification scenario 2: a remake — a replacement order for one
 * that went wrong, carrying `remake_details` with the parent order and whose
 * fault it was. Fault decides the money: Deliveroo's fault and the restaurant
 * is paid again, the restaurant's fault and the remake is free.
 *
 * Two blocks below post remakes at the real Convex route and read the stored
 * order back. The six `it.runIf(hasWebhookTarget)` blocks are untouched — they
 * POST at a deployed backend, announce themselves when one is not configured,
 * and were never the problem here.
 *
 * What the two rewritten blocks used to be: `createRemakeOrderWebhook(...)`
 * followed by `expect(remakeDetails.fault).toBe("deliveroo")` and
 * `expect(order.total_price.fractional).toBe(2500)` — the builder answering
 * for itself. Worse, both read `originalOrderId`, a module-level variable that
 * is only ever assigned inside the FIRST live block: in CI, where the live
 * blocks skip, the parent-order assertion compared `undefined` to `undefined`
 * and passed.
 *
 * @reference https://api-docs.deliveroo.com/docs/remake-orders
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  cancelPendingScheduledJobs,
  configureDeliverooEnv,
  newHarness,
  postSigned,
  readKitchenTickets,
  readOrders,
  seedStoreWithDeliveroo,
} from "./convex-harness";
import {
  announceSkippedLiveRun,
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
    configureDeliverooEnv();
    log.info("Starting Remake Orders Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
    announceSkippedLiveRun(
      "Scenario 2: Remake Orders",
      "6 tests that POST signed webhooks at the Convex endpoint — every " +
        "assertion about how the backend handles a remake order",
      "webhook",
    );
  });

  afterEach(cancelPendingScheduledJobs);

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
  // Test 6: A remake is charged, or not, according to fault
  // ========================================================================

  it("charges a Deliveroo-fault remake and gives a restaurant-fault one away", async () => {
    // `order_cost` and `total_price` are what the restaurant is paid for
    // making the food a second time. Both remakes are posted at the real
    // route, and what is asserted is the total that ended up in the database.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const parentId = generateOrderId("parent");

    const deliverooFault = createRemakeOrderWebhook(parentId, "deliveroo");
    const restaurantFault = createRemakeOrderWebhook(parentId, "restaurant");

    expect((await postSigned(t, JSON.stringify(deliverooFault))).status).toBe(200);
    expect((await postSigned(t, JSON.stringify(restaurantFault))).status).toBe(200);

    const orders = await readOrders(t);
    expect(orders).toHaveLength(2);

    const paid = orders.find((o) => o.externalOrderId === deliverooFault.body.order.id);
    const free = orders.find((o) => o.externalOrderId === restaurantFault.body.order.id);
    expect(paid!.total).toBe(2500);
    expect(free!.total).toBe(0);

    // Both are food somebody has to cook again, whoever pays for it.
    expect(await readKitchenTickets(t)).toHaveLength(2);
  });

  // ========================================================================
  // Test 7: The link back to the order being remade
  // ========================================================================

  it.todo(
    "links a remake to the order it replaces — `remake_details` is declared " +
      "on the payload type (convex/deliverooWebhook.ts:86) and read nowhere: " +
      "handleNewOrder never touches it, `isRemake` on the orders table " +
      "(convex-schema/src/tables/orders.ts:112, commented \"Flag for remake " +
      "orders from delivery platforms\") has no writer anywhere in the " +
      "repository, and nothing records `parent_order_id`, so a free remake is " +
      "indistinguishable in the takings from an order that was simply never " +
      "paid for",
  );

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
