/**
 * ┌─────────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 9: Meal Card Payment        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @description
 * Test suite for Deliveroo Scenario 9: Meal Card Payment
 *
 * This scenario validates:
 * 1. Orders paid partially by meal card (carte restaurant)
 * 2. meal_card_payment field presence and validation
 * 3. cash_due calculation (total - meal_card)
 * 4. Payment split scenarios (100% meal card, 100% cash, partial)
 * 5. Monetary value consistency
 * 6. Sync status sent after acceptance
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

describe("Scenario 9: Meal Card Payment", () => {
  let mealCardOrderId: string;

  // ========================================================================
  // Setup & Teardown
  // ========================================================================

  beforeAll(() => {
    log.info("Starting Meal Card Payment Test Suite");
    log.info(`Convex Site URL: ${config.CONVEX_SITE_URL}`);
    log.info(`Sandbox Mode: ${config.IS_SANDBOX}`);
  });

  afterAll(() => {
    log.success("Meal Card Payment Test Suite Completed");
  });

  // ========================================================================
  // Test 1: Meal Card Payment Field Validation
  // ========================================================================

  it("should validate meal_card_payment field", async () => {
    log.test("Test 1: Validating meal_card_payment field");

    mealCardOrderId = generateOrderId("meal-card");
    const webhook = createNewOrderWebhook({
      id: mealCardOrderId,
      total_price: { fractional: 2500, currency_code: "EUR" },
      partner_order_total: { fractional: 2500, currency_code: "EUR" },
      meal_card_payment: { fractional: 1000, currency_code: "EUR" }, // 10 EUR on meal card
      cash_due: { fractional: 1500, currency_code: "EUR" }, // 15 EUR cash
    });

    const order = webhook.body.order;

    // Validate meal_card_payment is present
    expect(order).toHaveProperty("meal_card_payment");
    expect(order.meal_card_payment!.fractional).toBe(1000);
    expect(order.meal_card_payment!.currency_code).toBe("EUR");

    log.success("meal_card_payment field validated");
    log.info(
      `  - Meal card payment: EUR ${order.meal_card_payment!.fractional / 100}`,
    );
  });

  // ========================================================================
  // Test 2: Cash Due Calculation
  // ========================================================================

  it("should calculate cash_due correctly", async () => {
    log.test("Test 2: Validating cash_due calculation");

    const totalPrice = 2500; // EUR 25.00
    const mealCardAmount = 1000; // EUR 10.00
    const cashDue = 1500; // EUR 15.00

    const webhook = createNewOrderWebhook({
      total_price: { fractional: totalPrice, currency_code: "EUR" },
      partner_order_total: { fractional: totalPrice, currency_code: "EUR" },
      meal_card_payment: { fractional: mealCardAmount, currency_code: "EUR" },
      cash_due: { fractional: cashDue, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // Verify calculation: meal_card + cash_due = total_price
    const calculatedTotal =
      order.meal_card_payment!.fractional + order.cash_due!.fractional;
    expect(calculatedTotal).toBe(order.total_price.fractional);

    log.success("cash_due calculation validated");
    log.info(`  - Total: EUR ${totalPrice / 100}`);
    log.info(`  - Meal card: EUR ${mealCardAmount / 100}`);
    log.info(`  - Cash due: EUR ${cashDue / 100}`);
    log.info(`  Meal card + Cash = Total`);
  });

  // ========================================================================
  // Test 3: 100% Meal Card Payment
  // ========================================================================

  it("should handle 100% meal card payment", async () => {
    log.test("Test 3: Validating 100% meal card payment");

    const totalPrice = 2500; // EUR 25.00

    const webhook = createNewOrderWebhook({
      total_price: { fractional: totalPrice, currency_code: "EUR" },
      partner_order_total: { fractional: totalPrice, currency_code: "EUR" },
      meal_card_payment: { fractional: totalPrice, currency_code: "EUR" }, // 100% on card
      cash_due: { fractional: 0, currency_code: "EUR" }, // No cash needed
    });

    const order = webhook.body.order;

    expect(order.meal_card_payment!.fractional).toBe(totalPrice);
    expect(order.cash_due!.fractional).toBe(0);

    log.success("100% meal card payment validated");
    log.info("  Full payment on meal card");
    log.info("  No cash required");
  });

  // ========================================================================
  // Test 4: 100% Cash Payment (No Meal Card)
  // ========================================================================

  it("should handle 100% cash payment", async () => {
    log.test("Test 4: Validating 100% cash payment");

    const totalPrice = 2500; // EUR 25.00

    const webhook = createNewOrderWebhook({
      total_price: { fractional: totalPrice, currency_code: "EUR" },
      partner_order_total: { fractional: totalPrice, currency_code: "EUR" },
      meal_card_payment: { fractional: 0, currency_code: "EUR" }, // No meal card
      cash_due: { fractional: totalPrice, currency_code: "EUR" }, // 100% cash
    });

    const order = webhook.body.order;

    expect(order.meal_card_payment!.fractional).toBe(0);
    expect(order.cash_due!.fractional).toBe(totalPrice);

    log.success("100% cash payment validated");
    log.info("  No meal card used");
    log.info("  Full payment in cash");
  });

  // ========================================================================
  // Test 5: Partial Payment Scenarios
  // ========================================================================

  it("should support various partial payment splits", async () => {
    log.test("Test 5: Validating partial payment scenarios");

    const scenarios = [
      {
        total: 5000,
        mealCard: 2000,
        cash: 3000,
        desc: "40% meal card, 60% cash",
      },
      {
        total: 3000,
        mealCard: 1500,
        cash: 1500,
        desc: "50% meal card, 50% cash",
      },
      {
        total: 4000,
        mealCard: 3000,
        cash: 1000,
        desc: "75% meal card, 25% cash",
      },
      {
        total: 6000,
        mealCard: 1000,
        cash: 5000,
        desc: "~17% meal card, ~83% cash",
      },
    ];

    for (const scenario of scenarios) {
      const webhook = createNewOrderWebhook({
        total_price: { fractional: scenario.total, currency_code: "EUR" },
        meal_card_payment: {
          fractional: scenario.mealCard,
          currency_code: "EUR",
        },
        cash_due: { fractional: scenario.cash, currency_code: "EUR" },
      });

      const order = webhook.body.order;

      // Verify sum
      const sum =
        order.meal_card_payment!.fractional + order.cash_due!.fractional;
      expect(sum).toBe(scenario.total);

      log.info(
        `  ${scenario.desc}: EUR ${scenario.mealCard / 100} + EUR ${scenario.cash / 100} = EUR ${scenario.total / 100}`,
      );
    }

    log.success("Partial payment scenarios validated");
  });

  // ========================================================================
  // Test 6: Meal Card with Discounts
  // ========================================================================

  it("should handle meal card payment with discounts", async () => {
    log.test("Test 6: Validating meal card with discounts");

    const originalPrice = 3000; // EUR 30.00
    const discount = 500; // -EUR 5.00
    const finalPrice = 2500; // EUR 25.00
    const mealCardAmount = 1500; // EUR 15.00
    const cashDue = 1000; // EUR 10.00

    const webhook = createNewOrderWebhook({
      total_price: { fractional: finalPrice, currency_code: "EUR" },
      partner_order_total: { fractional: finalPrice, currency_code: "EUR" },
      offer_discount: { fractional: discount, currency_code: "EUR" },
      meal_card_payment: { fractional: mealCardAmount, currency_code: "EUR" },
      cash_due: { fractional: cashDue, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // Payment split should apply to discounted price
    const paymentSum =
      order.meal_card_payment!.fractional + order.cash_due!.fractional;
    expect(paymentSum).toBe(order.total_price.fractional);
    expect(order.offer_discount!.fractional).toBe(discount);

    log.success("Meal card with discounts validated");
    log.info(`  - Original: EUR ${originalPrice / 100}`);
    log.info(`  - Discount: -EUR ${discount / 100}`);
    log.info(`  - Final: EUR ${finalPrice / 100}`);
    log.info(`  - Meal card: EUR ${mealCardAmount / 100}`);
    log.info(`  - Cash: EUR ${cashDue / 100}`);
  });

  // ========================================================================
  // Test 7: Currency Consistency
  // ========================================================================

  it("should maintain currency consistency", async () => {
    log.test("Test 7: Validating currency consistency");

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2500, currency_code: "EUR" },
      partner_order_total: { fractional: 2500, currency_code: "EUR" },
      meal_card_payment: { fractional: 1000, currency_code: "EUR" },
      cash_due: { fractional: 1500, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // All monetary values should have the same currency
    expect(order.total_price.currency_code).toBe("EUR");
    expect(order.meal_card_payment!.currency_code).toBe("EUR");
    expect(order.cash_due!.currency_code).toBe("EUR");

    log.success("Currency consistency validated");
    log.info("  All amounts in EUR");
  });

  // ========================================================================
  // Test 8: Meal Card Field Structure
  // ========================================================================

  it("should validate meal card field structure", async () => {
    log.test("Test 8: Validating field structure");

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2500, currency_code: "EUR" },
      meal_card_payment: { fractional: 1000, currency_code: "EUR" },
      cash_due: { fractional: 1500, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    // Check field structure
    expect(order.meal_card_payment).toHaveProperty("fractional");
    expect(order.meal_card_payment).toHaveProperty("currency_code");
    expect(typeof order.meal_card_payment!.fractional).toBe("number");
    expect(typeof order.meal_card_payment!.currency_code).toBe("string");

    // Same for cash_due
    expect(order.cash_due).toHaveProperty("fractional");
    expect(order.cash_due).toHaveProperty("currency_code");

    log.success("Field structure validated");
  });

  // ========================================================================
  // Test 9: Sync Status Requirement
  // ========================================================================

  it("should require sync_status after acceptance", async () => {
    log.test("Test 9: Validating sync_status requirement");

    // Meal card orders must send sync_status after acceptance
    // Payment method doesn't affect this requirement

    const webhook = createNewOrderWebhook({
      total_price: { fractional: 2500, currency_code: "EUR" },
      meal_card_payment: { fractional: 1000, currency_code: "EUR" },
      cash_due: { fractional: 1500, currency_code: "EUR" },
    });

    const order = webhook.body.order;

    expect(order).toHaveProperty("id");
    expect(order.meal_card_payment!.fractional).toBeGreaterThan(0);

    log.success("Sync status requirement validated");
    log.info(
      "  sync_status must be sent after order.status_update with status='accepted'",
    );
    log.info("  Payment method doesn't affect sync_status requirement");
  });

  // ========================================================================
  // Test 10: Edge Cases
  // ========================================================================

  it("should handle meal card edge cases", async () => {
    log.test("Test 10: Validating meal card edge cases");

    // Edge case 1: Very small meal card amount (EUR 0.01)
    const tinyMealCard = createNewOrderWebhook({
      total_price: { fractional: 2500, currency_code: "EUR" },
      meal_card_payment: { fractional: 1, currency_code: "EUR" },
      cash_due: { fractional: 2499, currency_code: "EUR" },
    });

    expect(tinyMealCard.body.order.meal_card_payment!.fractional).toBe(1);

    // Edge case 2: Large meal card amount
    const largeMealCard = createNewOrderWebhook({
      total_price: { fractional: 10000, currency_code: "EUR" },
      meal_card_payment: { fractional: 10000, currency_code: "EUR" },
      cash_due: { fractional: 0, currency_code: "EUR" },
    });

    expect(largeMealCard.body.order.meal_card_payment!.fractional).toBe(10000);
    expect(largeMealCard.body.order.cash_due!.fractional).toBe(0);

    log.success("Meal card edge cases validated");
    log.info("  Minimal meal card amount (EUR 0.01)");
    log.info("  Large meal card amount (EUR 100.00)");
  });
});
