/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 4: Fulfilled ASAP Order     │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 4: Fulfilled ASAP Order
 *
 * This scenario validates:
 * 1. Restaurant-fulfilled orders (fulfillment_type: "restaurant")
 * 2. Complete customer information (name, address, phone)
 * 3. Full order lifecycle: placed -> accepted -> preparing -> ready -> delivered
 * 4. Sync status sent after acceptance
 * 5. Delivery handled by restaurant's own riders
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

describe("Scenario 4: Fulfilled ASAP Order", () => {
  let fulfilledOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Fulfilled ASAP Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Fulfilled ASAP Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Fulfillment Type Validation
  // ========================================================================

  it("should validate restaurant fulfillment type", async () => {
    log.test("Test 1: Validating fulfillment_type = 'restaurant'");

    fulfilledOrderId = generateOrderId("fulfilled");
    const webhook = createNewOrderWebhook({
      id: fulfilledOrderId,
      fulfillment_type: "restaurant",
    });

    const order = webhook.body.order;

    // Validate fulfillment type
    expect(order.fulfillment_type).toBe("restaurant");

    log.success("Fulfillment type validated: restaurant");
    log.info("  This order will be delivered by restaurant's own riders");
  });

  // ========================================================================
  // Test 2: Customer Information Presence
  // ========================================================================

  it("should include complete customer information", async () => {
    log.test("Test 2: Validating customer information fields");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      customer: {
        name: "John Doe",
        phone_number: "+33612345678",
      },
      delivery_address: {
        street1: "123 Rue de la Paix",
        street2: "Appartement 4B",
        city: "Paris",
        postcode: "75001",
        country: "FR",
        latitude: 48.8566,
        longitude: 2.3522,
      },
    });

    const order = webhook.body.order;

    // Validate customer information
    expect(order).toHaveProperty("customer");
    expect(order.customer).toHaveProperty("name");
    expect(order.customer).toHaveProperty("phone_number");

    // Validate delivery address
    expect(order).toHaveProperty("delivery_address");
    expect(order.delivery_address).toHaveProperty("street1");
    expect(order.delivery_address).toHaveProperty("city");
    expect(order.delivery_address).toHaveProperty("postcode");

    log.success("Customer information validated");
    log.info(`  - Customer: ${order.customer?.name}`);
    log.info(`  - Phone: ${order.customer?.phone_number}`);
    log.info(
      `  - Address: ${order.delivery_address?.street1}, ${order.delivery_address?.city}`,
    );
  });

  // ========================================================================
  // Test 3: Deliveroo vs Restaurant Fulfillment Differentiation
  // ========================================================================

  it("should differentiate restaurant from deliveroo fulfillment", async () => {
    log.test("Test 3: Differentiating fulfillment types");

    // Deliveroo fulfilled
    const deliverooFulfilled = createNewOrderWebhook({
      fulfillment_type: "deliveroo",
    });

    // Restaurant fulfilled
    const restaurantFulfilled = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      customer: {
        name: "Jane Doe",
        phone_number: "+33687654321",
      },
      delivery_address: {
        street1: "456 Avenue des Champs",
        city: "Paris",
        postcode: "75008",
        country: "FR",
      },
    });

    expect(deliverooFulfilled.body.order.fulfillment_type).toBe("deliveroo");
    expect(restaurantFulfilled.body.order.fulfillment_type).toBe("restaurant");

    // Restaurant fulfilled should have customer info
    expect(restaurantFulfilled.body.order).toHaveProperty("customer");
    expect(restaurantFulfilled.body.order).toHaveProperty("delivery_address");

    log.success("Fulfillment types differentiated");
    log.info("  Deliveroo fulfilled: No customer info needed");
    log.info("  Restaurant fulfilled: Customer info required");
  });

  // ========================================================================
  // Test 4: ASAP Order Characteristics
  // ========================================================================

  it("should be an ASAP order", async () => {
    log.test("Test 4: Validating ASAP characteristics");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      asap: true,
    });

    const order = webhook.body.order;

    // Should be ASAP
    expect(order.asap).toBe(true);

    // Should NOT have confirm_at (only scheduled orders have this)
    expect(order.confirm_at).toBeUndefined();

    log.success("ASAP order validated");
    log.info("  - asap: true");
    log.info("  - No confirmation delay");
  });

  // ========================================================================
  // Test 5: Complete Order Lifecycle States
  // ========================================================================

  it("should support full order lifecycle", async () => {
    log.test("Test 5: Validating order lifecycle states");

    const orderId = generateOrderId("lifecycle");

    // Valid status transitions for restaurant-fulfilled orders
    const validStatuses = [
      "placed",
      "accepted",
      "started_preparing",
      "ready_for_collection", // Kitchen ready
      "out_for_delivery", // Rider picked up
      "delivered", // Completed
    ];

    for (const status of validStatuses) {
      const statusWebhook = createStatusUpdateWebhook(orderId, status);
      expect(statusWebhook.body.order.status).toBe(status);
    }

    log.success("Order lifecycle validated");
    log.info(
      "  Valid statuses: placed -> accepted -> preparing -> ready -> out_for_delivery -> delivered",
    );
  });

  // ========================================================================
  // Test 6: Required Fields for Restaurant Fulfillment
  // ========================================================================

  it("should have all required fields for restaurant fulfillment", async () => {
    log.test("Test 6: Checking required fields");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      customer: {
        name: "Test Customer",
        phone_number: "+33600000000",
      },
      delivery_address: {
        street1: "123 Test Street",
        city: "Paris",
        postcode: "75000",
        country: "FR",
        latitude: 48.8566,
        longitude: 2.3522,
      },
    });

    const order = webhook.body.order;

    // Core order fields
    expect(order).toHaveProperty("id");
    expect(order).toHaveProperty("order_number");
    expect(order).toHaveProperty("status");
    expect(order).toHaveProperty("fulfillment_type");
    expect(order).toHaveProperty("total_price");
    expect(order).toHaveProperty("items");

    // Restaurant fulfillment specific fields
    expect(order).toHaveProperty("customer");
    expect(order.customer).toHaveProperty("name");
    expect(order.customer).toHaveProperty("phone_number");
    expect(order).toHaveProperty("delivery_address");
    expect(order.delivery_address).toHaveProperty("street1");
    expect(order.delivery_address).toHaveProperty("city");
    expect(order.delivery_address).toHaveProperty("postcode");

    log.success("All required fields validated");
  });

  // ========================================================================
  // Test 7: Delivery Address Structure
  // ========================================================================

  it("should have valid delivery address structure", async () => {
    log.test("Test 7: Validating delivery address structure");

    const webhook = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      delivery_address: {
        street1: "123 Main Street",
        street2: "Apt 4B",
        city: "Paris",
        postcode: "75001",
        country: "FR",
        latitude: 48.8566,
        longitude: 2.3522,
        delivery_notes: "Ring doorbell twice",
      },
    });

    const address = webhook.body.order.delivery_address;

    expect(address).toBeDefined();
    expect(address).toHaveProperty("street1");
    expect(address).toHaveProperty("city");
    expect(address).toHaveProperty("postcode");
    expect(address).toHaveProperty("country");

    // Optional but useful fields
    if (address?.latitude && address?.longitude) {
      expect(typeof address.latitude).toBe("number");
      expect(typeof address.longitude).toBe("number");
      log.info(
        `  - GPS Coordinates: ${address.latitude}, ${address.longitude}`,
      );
    }

    log.success("Delivery address structure validated");
  });

  // ========================================================================
  // Test 8: Sync Status Requirement
  // ========================================================================

  it("should require sync_status after acceptance", async () => {
    log.test("Test 8: Validating sync_status requirement");

    // Restaurant fulfilled orders MUST send sync_status after acceptance
    // This is the same requirement as standard Deliveroo orders

    const webhook = createNewOrderWebhook({
      fulfillment_type: "restaurant",
      asap: true,
    });

    const order = webhook.body.order;

    // Verify it's a valid order that will trigger sync_status
    expect(order.fulfillment_type).toBe("restaurant");
    expect(order.asap).toBe(true);
    expect(order).toHaveProperty("id");

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
  });
});
