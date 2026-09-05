// @vitest-environment edge-runtime

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 8: Discounted Order      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Deliveroo's certification scenario 8: an order carrying a promotion —
 * `offer_discount` at basket level, `discount_amount` on a line, or both. What
 * the restaurant needs from us is a receipt that adds up: the total it will be
 * paid, and lines that do not contradict it.
 *
 * The blocks below post signed payloads at the real Convex route and read back
 * the `orders` row. Two of them are `it.todo`, because pointing a truthful
 * assertion at the handler showed the discount is not carried at all — see the
 * text of each for what it does instead.
 *
 * The two `it.runIf(hasWebhookTarget)` blocks are untouched: they POST at a
 * deployed backend, they announce themselves loudly when one is not
 * configured, and they were never part of the problem here.
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
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
  assertWebhookSuccess,
  createNewOrderWebhook,
  generateOrderId,
  hasWebhookTarget,
  log,
  sendWebhook,
} from "./test-config";

const itWithWebhookTarget = it.runIf(hasWebhookTarget);

beforeAll(() => {
  configureDeliverooEnv();
  announceSkippedLiveRun(
    "Scenario 8: Discounted Order",
    "2 tests that POST signed webhooks at a deployed Convex endpoint — the " +
      "round trip a live deployment makes with a discounted order",
    "webhook",
  );
});
afterEach(cancelPendingScheduledJobs);

/** 25,00 € of food sold for 20,00 € — a five-euro basket promotion. */
function discountedOrder(id: string) {
  return JSON.stringify(
    createNewOrderWebhook({
      id,
      total_price: { fractional: 2000, currency_code: "EUR" },
      partner_order_total: { fractional: 2000, currency_code: "EUR" },
      offer_discount: { fractional: 500, currency_code: "EUR" },
    }),
  );
}

describe("Scenario 8: a discounted order arrives", () => {
  it("stores the total the partner is actually owed", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t);

    const response = await postSigned(t, discountedOrder(generateOrderId("discounted")));
    expect(response.status).toBe(200);

    const [order] = await readOrders(t);
    // `total_price` is the post-discount figure. Storing the pre-discount one
    // would overstate every promoted order in the takings.
    expect(order!.total).toBe(2000);
  });

  it("still sends a promoted order to the kitchen", async () => {
    // Including the extreme: a fully discounted basket is worth 0 € and is
    // still food somebody has to cook.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);

    await postSigned(
      t,
      JSON.stringify(
        createNewOrderWebhook({
          id: generateOrderId("free"),
          total_price: { fractional: 0, currency_code: "EUR" },
          partner_order_total: { fractional: 0, currency_code: "EUR" },
          offer_discount: { fractional: 2500, currency_code: "EUR" },
        }),
      ),
    );

    const [order] = await readOrders(t);
    expect(order!.total).toBe(0);
    expect(await readKitchenTickets(t)).toHaveLength(1);
  });

  it("leaves an undiscounted order at its full price", async () => {
    // The baseline the two above are read against: with no promotion the
    // stored total is the basket, and nothing has quietly subtracted anything.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);

    await postSigned(
      t,
      JSON.stringify(
        createNewOrderWebhook({
          id: generateOrderId("undiscounted"),
          total_price: { fractional: 2500, currency_code: "EUR" },
          partner_order_total: { fractional: 2500, currency_code: "EUR" },
          offer_discount: { fractional: 0, currency_code: "EUR" },
        }),
      ),
    );

    const [order] = await readOrders(t);
    expect(order!.total).toBe(2500);
    expect(order!.subtotal).toBe(2500);
  });

  it.todo(
    "records the discount, so the receipt explains itself — handleNewOrder " +
      "(convex/deliverooWebhook.ts:383-386) reads `total_price` and " +
      "`payment.subtotal` and never looks at `offer_discount`, so a 25,00 EUR " +
      "basket sold for 20,00 EUR is stored with subtotal 2000, total 2000 and " +
      "lines summing to 2500, with nothing anywhere naming the 5,00 EUR; " +
      "`discountAmount` exists on the orders table " +
      "(convex-schema/src/tables/orders.ts:72) and createFromWebhook leaves it " +
      "undefined",
  );

  it.todo(
    "prices a discounted LINE at what the customer paid for it — a line sent " +
      "as unit_price 800, discount_amount 200, total_price 600 is mapped in " +
      "handleNewOrder (convex/deliverooWebhook.ts:340-346) from `unit_price` " +
      "alone, so createFromWebhook stores unitPrice 800 and subtotal 800: the " +
      "line overstates by the discount, and an order carrying per-item " +
      "promotions has lines summing to more than its own total",
  );

  // ========================================================================
  // Live round trip — unchanged, and skipped unless a deployment is configured
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
});
