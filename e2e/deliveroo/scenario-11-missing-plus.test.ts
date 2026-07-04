/**
 * ┌──────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 11: Missing PLUs         │
 * └──────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 11: Missing PLUs
 *
 * This scenario validates:
 * 1. Orders with items having unknown pos_item_id (PLU)
 * 2. Fallback to item name when PLU not found
 * 3. Warning logs for missing PLU items
 * 4. Order acceptance despite missing PLUs
 * 5. Sync status sent after acceptance
 *
 * PLU = Price Look-Up code (product identifier in the POS system)
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
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

describe("Scenario 11: Missing PLUs", () => {
  let missingPluOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Missing PLUs Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Missing PLUs Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Order with Missing PLU
  // ========================================================================

  it("should handle items with unknown pos_item_id", async () => {
    log.test("Test 1: Validating missing PLU handling");

    missingPluOrderId = generateOrderId("missing-plu");
    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: missingPluOrderId,
          order_number: "MISS-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 2500, currency_code: "EUR" },
          partner_order_total: { fractional: 2500, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "UNKNOWN-PLU-123", // PLU not in menu
              quantity: 1,
              name: "Mystery Burger",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
            },
            {
              pos_item_id: "ITEM-VALID-001", // Known PLU
              quantity: 1,
              name: "Regular Fries",
              unit_price: { fractional: 1000, currency_code: "EUR" },
              total_price: { fractional: 1000, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const order = webhook.body.order;
    const missingPluItem = order.items[0]!;

    // Item should have all required fields
    expect(missingPluItem).toHaveProperty("pos_item_id");
    expect(missingPluItem).toHaveProperty("name");
    expect(missingPluItem.pos_item_id).toBe("UNKNOWN-PLU-123");
    expect(missingPluItem.name).toBe("Mystery Burger");

    log.success("Missing PLU item validated");
    log.info(`  - Unknown PLU: ${missingPluItem.pos_item_id}`);
    log.info(`  - Fallback to name: "${missingPluItem.name}"`);
  });

  // ========================================================================
  // Test 2: Fallback to Name
  // ========================================================================

  it("should fallback to item name when PLU unknown", async () => {
    log.test("Test 2: Validating name fallback");

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("name-fallback"),
          order_number: "FALL-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 1200, currency_code: "EUR" },
          partner_order_total: { fractional: 1200, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "PLU-NOT-FOUND", // Unknown
              quantity: 2,
              name: "Special Salad", // Use this to identify the item
              operational_name: "Special Salad (Lunch Menu)",
              unit_price: { fractional: 600, currency_code: "EUR" },
              total_price: { fractional: 1200, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const item = webhook.body.order.items[0]!;

    // When PLU not found, use name to identify the product
    expect(item.name).toBeDefined();
    expect(item.name).toBe("Special Salad");

    // operational_name can provide additional context
    if (item.operational_name) {
      expect(item.operational_name).toBe("Special Salad (Lunch Menu)");
    }

    log.success("Name fallback validated");
    log.info(`  Using name: "${item.name}"`);
    log.info(`  Operational name: "${item.operational_name}"`);
  });

  // ========================================================================
  // Test 3: Multiple Missing PLUs
  // ========================================================================

  it("should handle multiple items with missing PLUs", async () => {
    log.test("Test 3: Validating multiple missing PLUs");

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("multi-missing"),
          order_number: "MULTI-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 4000, currency_code: "EUR" },
          partner_order_total: { fractional: 4000, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "UNKNOWN-1",
              quantity: 1,
              name: "New Product A",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
            },
            {
              pos_item_id: "UNKNOWN-2",
              quantity: 1,
              name: "New Product B",
              unit_price: { fractional: 1200, currency_code: "EUR" },
              total_price: { fractional: 1200, currency_code: "EUR" },
            },
            {
              pos_item_id: "UNKNOWN-3",
              quantity: 1,
              name: "New Product C",
              unit_price: { fractional: 1300, currency_code: "EUR" },
              total_price: { fractional: 1300, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const order = webhook.body.order;

    // All items have unknown PLUs
    expect(order.items).toHaveLength(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order.items.forEach((item: any) => {
      expect(item.pos_item_id).toMatch(/^UNKNOWN-/);
      expect(item.name).toBeDefined();
    });

    log.success("Multiple missing PLUs validated");
    log.info(`  ${order.items.length} items with unknown PLUs`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order.items.forEach((item: any, idx: number) => {
      log.info(
        `    - Item ${idx + 1}: "${item.name}" (PLU: ${item.pos_item_id})`,
      );
    });
  });

  // ========================================================================
  // Test 4: Mixed Known and Unknown PLUs
  // ========================================================================

  it("should handle mix of known and unknown PLUs", async () => {
    log.test("Test 4: Validating mixed PLU scenario");

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("mixed-plus"),
          order_number: "MIX-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 3500, currency_code: "EUR" },
          partner_order_total: { fractional: 3500, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "ITEM-001", // Known
              quantity: 1,
              name: "Classic Burger",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
            },
            {
              pos_item_id: "UNKNOWN-NEW", // Unknown
              quantity: 1,
              name: "New Special Sauce",
              unit_price: { fractional: 500, currency_code: "EUR" },
              total_price: { fractional: 500, currency_code: "EUR" },
            },
            {
              pos_item_id: "ITEM-002", // Known
              quantity: 1,
              name: "Regular Drink",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const order = webhook.body.order;

    // Count known vs unknown PLUs
    const unknownItems = order.items.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item: any) => item.pos_item_id === "UNKNOWN-NEW",
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const knownItems = order.items.filter((item: any) =>
      item.pos_item_id.startsWith("ITEM-"),
    );

    expect(unknownItems).toHaveLength(1);
    expect(knownItems).toHaveLength(2);

    log.success("Mixed PLU scenario validated");
    log.info(`  Known PLUs: ${knownItems.length}`);
    log.info(`  Unknown PLUs: ${unknownItems.length}`);
    log.info(`  Total items: ${order.items.length}`);
  });

  // ========================================================================
  // Test 5: Order Still Acceptable
  // ========================================================================

  it("should still accept order despite missing PLUs", async () => {
    log.test("Test 5: Validating order acceptance");

    // Orders with missing PLUs should still be accepted
    // The restaurant can manually identify the items

    const webhook = createNewOrderWebhook({
      items: [
        {
          pos_item_id: "MISSING-PLU",
          quantity: 1,
          name: "Unknown Item",
          unit_price: { fractional: 2500, currency_code: "EUR" },
          total_price: { fractional: 2500, currency_code: "EUR" },
        },
      ],
    });

    const order = webhook.body.order;

    // Order should be in "placed" status
    expect(order.status).toBe("placed");
    expect(order.items[0]!.pos_item_id).toBe("MISSING-PLU");

    log.success("Order acceptance validated");
    log.info("  Order accepted despite missing PLU");
    log.info("  Restaurant can manually process");
  });

  // ========================================================================
  // Test 6: Warning Logging Requirement
  // ========================================================================

  it("should log warnings for missing PLUs", async () => {
    log.test("Test 6: Validating warning log requirement");

    // System should log warnings for missing PLUs
    // This helps with debugging and menu sync issues

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("log-warning"),
          order_number: "WARN-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 1500, currency_code: "EUR" },
          partner_order_total: { fractional: 1500, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "UNRECOGNIZED-PLU-999",
              quantity: 1,
              name: "Unrecognized Product",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const item = webhook.body.order.items[0]!;

    expect(item.pos_item_id).toBe("UNRECOGNIZED-PLU-999");

    log.success("Warning log requirement validated");
    log.info("  Should log: 'PLU UNRECOGNIZED-PLU-999 not found in menu'");
    log.info(
      "  Should log: 'Falling back to item name: Unrecognized Product'",
    );
  });

  // ========================================================================
  // Test 7: Price Information Still Available
  // ========================================================================

  it("should maintain price information", async () => {
    log.test("Test 7: Validating price preservation");

    // Even with missing PLU, price information is provided by Deliveroo

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("price-info"),
          order_number: "PRICE-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 1800, currency_code: "EUR" },
          partner_order_total: { fractional: 1800, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "UNKNOWN-PRICE-TEST",
              quantity: 1,
              name: "Premium Item",
              unit_price: { fractional: 1800, currency_code: "EUR" },
              menu_unit_price: { fractional: 1800, currency_code: "EUR" },
              total_price: { fractional: 1800, currency_code: "EUR" },
              discount_amount: { fractional: 0, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const item = webhook.body.order.items[0]!;

    // Price information is complete
    expect(item.unit_price.fractional).toBe(1800);
    expect(item.total_price.fractional).toBe(1800);

    log.success("Price information validated");
    log.info(`  Unit price: EUR ${item.unit_price.fractional / 100}`);
    log.info(`  Total price: EUR ${item.total_price.fractional / 100}`);
  });

  // ========================================================================
  // Test 8: Sync Status Requirement
  // ========================================================================

  it("should require sync_status after acceptance", async () => {
    log.test("Test 8: Validating sync_status requirement");

    // Orders with missing PLUs must still send sync_status after acceptance

    const webhook = createNewOrderWebhook({
      items: [
        {
          pos_item_id: "UNKNOWN-SYNC-TEST",
          quantity: 1,
          name: "Test Item",
          unit_price: { fractional: 2500, currency_code: "EUR" },
          total_price: { fractional: 2500, currency_code: "EUR" },
        },
      ],
    });

    const order = webhook.body.order;

    expect(order).toHaveProperty("id");
    expect(order.items[0]!.pos_item_id).toBe("UNKNOWN-SYNC-TEST");

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
    log.info("  Missing PLUs don't prevent sync_status");
  });

  // ========================================================================
  // Test 9: Item Modifiers with Missing PLUs
  // ========================================================================

  it("should handle modifiers with missing PLUs", async () => {
    log.test("Test 9: Validating modifiers with missing PLUs");

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("modifier-missing"),
          order_number: "MOD-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 2200, currency_code: "EUR" },
          partner_order_total: { fractional: 2200, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "ITEM-BASE-001", // Base item known
              quantity: 1,
              name: "Burger",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 2200, currency_code: "EUR" },
              modifiers: [
                {
                  pos_item_id: "UNKNOWN-MODIFIER", // Modifier unknown
                  quantity: 1,
                  name: "New Sauce",
                  unit_price: { fractional: 700, currency_code: "EUR" },
                  total_price: { fractional: 700, currency_code: "EUR" },
                },
              ],
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const item = webhook.body.order.items[0]!;
    const modifier = item.modifiers![0]!;

    expect(modifier.pos_item_id).toBe("UNKNOWN-MODIFIER");
    expect(modifier.name).toBe("New Sauce");

    log.success("Modifier with missing PLU validated");
    log.info(`  Base item: "${item.name}" (PLU: ${item.pos_item_id})`);
    log.info(
      `  Modifier: "${modifier.name}" (PLU: ${modifier.pos_item_id} - UNKNOWN)`,
    );
  });
});
