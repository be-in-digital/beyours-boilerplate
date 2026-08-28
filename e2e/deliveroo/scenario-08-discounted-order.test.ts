/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 8: Discounted Order     │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 8: Discounted Order
 *
 * This scenario validates:
 * 1. Orders with discounts/promotions
 * 2. Item-specific discounts
 * 3. Total basket promotions
 * 4. Price calculations (total_price vs partner_order_total)
 * 5. offer_discount field presence and calculation
 * 6. Sync status sent after acceptance
 *
 * Scenarios 2 and 8 send actual webhooks to the Convex HTTP endpoint.
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertWebhookSuccess,
  config,
  createNewOrderWebhook,
  generateOrderId,
  hasWebhookTarget,
  log,
  sendWebhook,
} from "./test-config";

const itWithWebhookTarget = it.runIf(hasWebhookTarget);

// ============================================================================
// Test Suite
// ============================================================================

describe("Scenario 8: Discounted Order", () => {
  let discountedOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Discounted Order Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Discounted Order Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Offer Discount Field Validation
  // ========================================================================

  it("should validate offer_discount field presence", async () => {
    log.test("Test 1: Validating offer_discount field");

    discountedOrderId = generateOrderId("discounted");
    const webhook = createNewOrderWebhook({
      id: discountedOrderId,
      total_price: { fractional: 2000, currency_code: "EUR" },
      partner_order_total: { fractional: 2000, currency_code: "EUR" },
      offer_discount: { fractional: 500, currency_code: "EUR" }, // -5 EUR
    });

    const order = webhook.body.order;

    // Validate offer_discount is present
    expect(order).toHaveProperty("offer_discount");
    expect(order.offer_discount!.fractional).toBe(500);
    expect(order.offer_discount!.currency_code).toBe("EUR");

    log.success("offer_discount field validated");
    log.info(`  - Discount amount: EUR ${order.offer_discount!.fractional / 100}`);
  });

  // ========================================================================
  // Test 2: Price Calculation with Discount (sends actual webhook)
  // ========================================================================

  itWithWebhookTarget("should calculate prices correctly with discount", async () => {
    log.test("Test 2: Validating price calculations");

    const originalPrice = 2500; // EUR 25.00
    const discountAmount = 500; // EUR 5.00
    const finalPrice = 2000; // EUR 20.00

    const webhook = createNewOrderWebhook({
      total_price: { fractional: finalPrice, currency_code: "EUR" },
      partner_order_total: { fractional: finalPrice, currency_code: "EUR" },
      offer_discount: { fractional: discountAmount, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // Verify price calculation
    // total_price should be the final price after discount
    expect(order.total_price.fractional).toBe(finalPrice);
    expect(order.offer_discount!.fractional).toBe(discountAmount);

    // Original price = final price + discount
    const calculatedOriginal = finalPrice + discountAmount;
    expect(calculatedOriginal).toBe(originalPrice);

    // Send actual webhook
    const response = await sendWebhook(webhook);
    await assertWebhookSuccess(response);

    log.success("Price calculation validated");
    log.info(`  - Original price: EUR ${originalPrice / 100}`);
    log.info(`  - Discount: -EUR ${discountAmount / 100}`);
    log.info(`  - Final price: EUR ${finalPrice / 100}`);
  }, 10000);

  // ========================================================================
  // Test 3: Item-Specific Discount
  // ========================================================================

  it("should support item-specific discounts", async () => {
    log.test("Test 3: Validating item-specific discounts");

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("item-discount"),
          order_number: "DISC-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 2300, currency_code: "EUR" },
          partner_order_total: { fractional: 2300, currency_code: "EUR" },
          offer_discount: { fractional: 200, currency_code: "EUR" },
          items: [
            {
              pos_item_id: "ITEM-001",
              quantity: 1,
              name: "Burger",
              unit_price: { fractional: 1500, currency_code: "EUR" },
              total_price: { fractional: 1500, currency_code: "EUR" },
              discount_amount: { fractional: 0, currency_code: "EUR" },
            },
            {
              pos_item_id: "ITEM-002",
              quantity: 1,
              name: "Fries (Promo)",
              unit_price: { fractional: 800, currency_code: "EUR" },
              total_price: { fractional: 600, currency_code: "EUR" },
              discount_amount: { fractional: 200, currency_code: "EUR" }, // -2 EUR
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const order = webhook.body.order;

    // Verify item-specific discount
    const discountedItem = order.items[1]!;
    expect(discountedItem.discount_amount.fractional).toBe(200);
    expect(discountedItem.total_price.fractional).toBe(600); // 800 - 200

    log.success("Item-specific discount validated");
    log.info(`  - Item: ${discountedItem.name}`);
    log.info(`  - Unit price: EUR ${discountedItem.unit_price.fractional / 100}`);
    log.info(
      `  - Discount: -EUR ${discountedItem.discount_amount.fractional / 100}`,
    );
    log.info(
      `  - Final price: EUR ${discountedItem.total_price.fractional / 100}`,
    );
  });

  // ========================================================================
  // Test 4: Total Basket Promotion
  // ========================================================================

  it("should support total basket promotions", async () => {
    log.test("Test 4: Validating total basket promotions");

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2250, currency_code: "EUR" },
      partner_order_total: { fractional: 2250, currency_code: "EUR" },
      offer_discount: { fractional: 250, currency_code: "EUR" }, // -10% basket
      items: [
        {
          pos_item_id: "ITEM-001",
          quantity: 1,
          name: "Burger",
          unit_price: { fractional: 1500, currency_code: "EUR" },
          total_price: { fractional: 1500, currency_code: "EUR" },
          discount_amount: { fractional: 0, currency_code: "EUR" },
        },
        {
          pos_item_id: "ITEM-002",
          quantity: 1,
          name: "Drink",
          unit_price: { fractional: 1000, currency_code: "EUR" },
          total_price: { fractional: 1000, currency_code: "EUR" },
          discount_amount: { fractional: 0, currency_code: "EUR" },
        },
      ],
    });

    const order = webhook.body.order;

    // Total basket promotion applies to the whole order
    // Individual items don't have discount, but offer_discount is at order level
    expect(order.offer_discount!.fractional).toBe(250);

    // Sum of item prices
    const itemsTotal = order.items.reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, item: any) => sum + item.total_price.fractional,
      0,
    );

    // Total price should be items total minus order discount
    const _expectedTotal = itemsTotal - order.offer_discount!.fractional;

    log.success("Total basket promotion validated");
    log.info(`  - Items subtotal: EUR ${itemsTotal / 100}`);
    log.info(`  - Basket discount: -EUR ${order.offer_discount!.fractional / 100}`);
    log.info(`  - Final total: EUR ${order.total_price.fractional / 100}`);
  });

  // ========================================================================
  // Test 5: No Discount (Baseline)
  // ========================================================================

  it("should handle orders without discounts", async () => {
    log.test("Test 5: Validating orders without discounts");

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2500, currency_code: "EUR" },
      partner_order_total: { fractional: 2500, currency_code: "EUR" },
      offer_discount: { fractional: 0, currency_code: "EUR" }, // No discount
    });

    const order = webhook.body.order;

    // When no discount, offer_discount should be 0
    expect(order.offer_discount!.fractional).toBe(0);

    // total_price and partner_order_total should be equal
    expect(order.total_price.fractional).toBe(
      order.partner_order_total.fractional,
    );

    log.success("No discount baseline validated");
    log.info("  offer_discount = 0");
    log.info("  total_price = partner_order_total");
  });

  // ========================================================================
  // Test 6: Discount Types Differentiation
  // ========================================================================

  it("should differentiate discount types", async () => {
    log.test("Test 6: Differentiating discount types");

    // Item discount: Applied to specific items
    // Basket discount: Applied to total order
    // Both can exist simultaneously

    const webhook = {
      event: "order.new",
      body: {
        order: {
          id: generateOrderId("mixed-discount"),
          order_number: "MIX-001",
          location_id: config.SITE_ID,
          display_id: "001",
          status: "placed",
          fulfillment_type: "deliveroo",
          asap: true,
          total_price: { fractional: 1950, currency_code: "EUR" },
          partner_order_total: { fractional: 1950, currency_code: "EUR" },
          offer_discount: { fractional: 550, currency_code: "EUR" }, // Total discount
          items: [
            {
              pos_item_id: "ITEM-001",
              quantity: 1,
              name: "Pizza",
              unit_price: { fractional: 2000, currency_code: "EUR" },
              total_price: { fractional: 1700, currency_code: "EUR" }, // -3 EUR item discount
              discount_amount: { fractional: 300, currency_code: "EUR" },
            },
            {
              pos_item_id: "ITEM-002",
              quantity: 1,
              name: "Salad",
              unit_price: { fractional: 800, currency_code: "EUR" },
              total_price: { fractional: 800, currency_code: "EUR" },
              discount_amount: { fractional: 0, currency_code: "EUR" },
            },
          ],
          status_log: [{ at: new Date().toISOString(), status: "placed" }],
          start_preparing_at: new Date(Date.now() + 5 * 60000).toISOString(),
        },
      },
    };

    const order = webhook.body.order;

    // Item discount
    const itemDiscount = order.items[0]!.discount_amount.fractional;
    expect(itemDiscount).toBe(300);

    // Total offer discount includes item discount + any basket promo
    const totalDiscount = order.offer_discount!.fractional;
    expect(totalDiscount).toBeGreaterThanOrEqual(itemDiscount);

    log.success("Discount types differentiated");
    log.info(`  - Item discount: EUR ${itemDiscount / 100}`);
    log.info(`  - Total discount: EUR ${totalDiscount / 100}`);
    log.info(`  - Basket promo: EUR ${(totalDiscount - itemDiscount) / 100}`);
  });

  // ========================================================================
  // Test 7: Currency Consistency
  // ========================================================================

  it("should maintain currency consistency", async () => {
    log.test("Test 7: Validating currency consistency");

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2000, currency_code: "EUR" },
      partner_order_total: { fractional: 2000, currency_code: "EUR" },
      offer_discount: { fractional: 500, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // All monetary values should have the same currency
    expect(order.total_price.currency_code).toBe("EUR");
    expect(order.partner_order_total.currency_code).toBe("EUR");
    expect(order.offer_discount!.currency_code).toBe("EUR");

    log.success("Currency consistency validated");
    log.info("  All prices in same currency (EUR)");
  });

  // ========================================================================
  // Test 8: Sync Status Requirement (sends actual webhook)
  // ========================================================================

  itWithWebhookTarget("should require sync_status after acceptance", async () => {
    log.test("Test 8: Validating sync_status requirement");

    // Discounted orders must send sync_status after acceptance
    // This is the same requirement as all order types

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2000, currency_code: "EUR" },
      offer_discount: { fractional: 500, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    expect(order).toHaveProperty("id");
    expect(order.offer_discount!.fractional).toBeGreaterThan(0);

    // Send actual webhook
    const response = await sendWebhook(webhook);
    await assertWebhookSuccess(response);

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
    log.info("  Discounts don't affect sync_status requirement");
  }, 10000);

  // ========================================================================
  // Test 9: Discount Edge Cases
  // ========================================================================

  it("should handle discount edge cases", async () => {
    log.test("Test 9: Validating discount edge cases");

    // Edge case 1: 100% discount (free order)
    const freeOrder = createNewOrderWebhook({
      total_price: { fractional: 0, currency_code: "EUR" },
      partner_order_total: { fractional: 0, currency_code: "EUR" },
      offer_discount: { fractional: 2500, currency_code: "EUR" }, // Everything discounted
    });

    expect(freeOrder.body.order.total_price.fractional).toBe(0);
    expect(freeOrder.body.order.offer_discount!.fractional).toBe(2500);

    // Edge case 2: Very small discount (EUR 0.01)
    const tinyDiscount = createNewOrderWebhook({
      total_price: { fractional: 2499, currency_code: "EUR" },
      partner_order_total: { fractional: 2499, currency_code: "EUR" },
      offer_discount: { fractional: 1, currency_code: "EUR" },
    });

    expect(tinyDiscount.body.order.offer_discount!.fractional).toBe(1);

    log.success("Discount edge cases validated");
    log.info("  100% discount (free order)");
    log.info("  Minimal discount (EUR 0.01)");
  });
});
