// @vitest-environment edge-runtime

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 7: Cancelled Order       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Deliveroo's certification scenario 7: an order cancelled by the customer or
 * by the platform. A cancellation from a platform is a FACT, not a request —
 * the food is off whatever our own status machine would have allowed — and
 * the interesting cases are the edges: the retry that changes nothing, the
 * cancellation that arrives after the food was handed over, and the spelling.
 *
 * The straight case (a cancellation stops the kitchen, including one for an
 * order already being prepared) is covered in
 * `tests/convex/deliveroo-webhook.test.ts`; this file deliberately owns what
 * that one does not, so neither is padding for the other.
 *
 * Of the eleven blocks this file used to hold, exactly one touched product
 * code — the transition-table check below, kept as it was. The other ten
 * asserted that `createStatusUpdateWebhook(id, "cancelled")` had produced the
 * status "cancelled".
 *
 * @reference https://api-docs.deliveroo.com/docs/order-integration
 * @reference https://api-docs.deliveroo.com/docs/cancelled-orders
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { canTransitionTo } from "@be-in-digital/restaurant";
import { mapDeliverooStatus } from "../../convex/deliverooWebhook";
import {
  cancelPendingScheduledJobs,
  configureDeliverooEnv,
  newHarness,
  postSigned,
  readKitchenTickets,
  readOrders,
  readWebhookFailures,
  seedStoreWithDeliveroo,
} from "./convex-harness";
import {
  createNewOrderWebhook,
  createStatusUpdateWebhook,
  generateOrderId,
} from "./test-config";

beforeAll(() => configureDeliverooEnv());
afterEach(cancelPendingScheduledJobs);

async function placeOrder(t: ReturnType<typeof newHarness>): Promise<string> {
  const orderId = generateOrderId("cancelled");
  const response = await postSigned(t, JSON.stringify(createNewOrderWebhook({ id: orderId })));
  expect(response.status).toBe(200);
  return orderId;
}

describe("Scenario 7: cancellation restrictions", () => {
  it("refuses cancellation once the order is being prepared", () => {
    // Deliveroo forbids cancelling an order that is already being made, ready
    // for collection, or with a rider. The internal status machine has to say
    // the same thing — asserted here against the production mapper and the
    // production transition table, not against a restatement of either.
    //
    // This used to feed `started_preparing`, `ready_for_collection` and
    // `out_for_delivery` to the mapper and assert they were not cancellable.
    // Deliveroo sends none of them: they are prep STAGES we push to
    // `/prep_stage`, not order statuses we receive (04-order-api.md). The
    // mapper answered "pending" for all three — which IS cancellable — and the
    // assertion only held because `canTransitionTo("pending", "cancelled")`
    // was never what it was really asking. The two claims are separated below.
    const cancellableOnDeliveroo = ["placed", "accepted", "confirmed"];
    for (const deliverooStatus of cancellableOnDeliveroo) {
      const internal = mapDeliverooStatus(deliverooStatus);
      expect(
        internal,
        `${deliverooStatus} is part of Deliveroo's order vocabulary`,
      ).not.toBeNull();
      expect(
        canTransitionTo(internal!, "cancelled"),
        `${deliverooStatus} (${internal}) should be cancellable`,
      ).toBe(true);
    }

    // Once the kitchen has the order, our own machine refuses — whoever asks.
    const notCancellable = ["preparing", "ready", "out_for_delivery"] as const;
    for (const internal of notCancellable) {
      expect(
        canTransitionTo(internal, "cancelled"),
        `${internal} must not be cancellable`,
      ).toBe(false);
    }
  });
});

describe("Scenario 7: a cancellation reaches the webhook", () => {
  it("is honoured whichever way Deliveroo spells it", async () => {
    // Deliveroo sends `canceled`, with one l. Every fixture in this directory
    // was written against the British `cancelled`, and both have to work or
    // half of these suites would be testing a spelling nothing sends.
    for (const spelling of ["canceled", "cancelled"]) {
      const t = newHarness();
      await seedStoreWithDeliveroo(t);
      const orderId = await placeOrder(t);

      const response = await postSigned(
        t,
        JSON.stringify(
          createStatusUpdateWebhook(orderId, spelling, {
            cancellation_reason: "customer_request",
          }),
        ),
      );
      expect(response.status).toBe(200);

      const [order] = await readOrders(t);
      const [ticket] = await readKitchenTickets(t);
      expect(order!.status, `Deliveroo spelling "${spelling}"`).toBe("cancelled");
      expect(order!.cancellationReason).toBe("customer_request");
      expect(ticket!.status).toBe("cancelled");
    }
  });

  it("refuses a cancellation for food already handed over, and keeps it", async () => {
    // Past `delivered` a cancellation is somebody's refund, not a kitchen
    // event: rewriting the order would erase the fact that the food went out.
    // It must not be silently dropped either, which is why the dead letter is
    // asserted and not just the unchanged status.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = await placeOrder(t);

    const [created] = await readOrders(t);
    await t.run((ctx) => ctx.db.patch(created!._id, { status: "delivered" as const }));

    const response = await postSigned(
      t,
      JSON.stringify(createStatusUpdateWebhook(orderId, "canceled")),
    );
    expect(response.status).toBe(200);

    const [order] = await readOrders(t);
    expect(order!.status).toBe("delivered");
    expect(order!.cancelledAt).toBeUndefined();

    const failures = await readWebhookFailures(t);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.detail).toContain("already_delivered");
  });

  it("treats a redelivered cancellation as the no-op it is", async () => {
    // Deliveroo retries on any non-2xx and sometimes simply repeats itself.
    // The second one must change nothing AND record nothing: a dead letter per
    // retry turns the table meant for real losses into noise.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = await placeOrder(t);

    const cancel = JSON.stringify(createStatusUpdateWebhook(orderId, "canceled"));
    expect((await postSigned(t, cancel)).status).toBe(200);
    const [afterFirst] = await readOrders(t);
    const cancelledAt = afterFirst!.cancelledAt;

    expect((await postSigned(t, cancel)).status).toBe(200);

    const [afterSecond] = await readOrders(t);
    expect(afterSecond!.status).toBe("cancelled");
    expect(afterSecond!.cancelledAt).toBe(cancelledAt);
    expect(await readWebhookFailures(t)).toHaveLength(0);
  });
});
