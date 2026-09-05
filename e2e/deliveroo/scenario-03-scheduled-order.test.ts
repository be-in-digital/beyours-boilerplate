// @vitest-environment edge-runtime

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │   Deliveroo Integration - Scenario 3: Scheduled Orders      │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @description
 * Deliveroo's certification scenario 3: an order placed now for later
 * (`asap: false` with a `confirm_at`). The contract has two halves and this
 * file drives both through the real Convex route:
 *
 *  - the order is ACCEPTED straight away, so Deliveroo stops waiting on us,
 *    and its CONFIRMATION is parked on the scheduler until `confirm_at`;
 *  - the kitchen gets the ticket immediately, because a scheduled order still
 *    has to be planned for.
 *
 * The Deliveroo API is recorded rather than called (`withDeliverooApi`), so
 * what the product actually sent — the URL, the method, the body — is what
 * gets asserted.
 *
 * Before this rewrite the file had six blocks and none of them ran any of the
 * above: each built a payload with `createNewOrderWebhook({ asap: false, … })`
 * and then checked that `asap` was false and that `confirm_at` parsed to a
 * date after now. It was testing `Date`.
 *
 * @reference https://api-docs.deliveroo.com/docs/scheduled-orders-1
 */

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
  apiCallsExcludingAuth,
  cancelPendingScheduledJobs,
  configureDeliverooEnv,
  newHarness,
  postSigned,
  readKitchenTickets,
  readOrders,
  readScheduledJobs,
  seedStoreWithDeliveroo,
  withDeliverooApi,
} from "./convex-harness";
import { createNewOrderWebhook, generateOrderId } from "./test-config";

// Scheduled orders are a dialogue with Deliveroo — accept now, confirm later —
// so this suite runs with credentials and records every outbound call.
beforeAll(() => configureDeliverooEnv({ withApiCredentials: true }));
afterEach(cancelPendingScheduledJobs);

const HALF_AN_HOUR = 30 * 60 * 1000;
const AN_HOUR = 60 * 60 * 1000;

function scheduledOrder(id: string, confirmAt: number) {
  return JSON.stringify(
    createNewOrderWebhook({
      id,
      asap: false,
      confirm_at: new Date(confirmAt).toISOString(),
      start_preparing_at: new Date(confirmAt + HALF_AN_HOUR).toISOString(),
      prepare_for: new Date(confirmAt + AN_HOUR).toISOString(),
    }),
  );
}

describe("Scenario 3: a scheduled order arrives", () => {
  it("accepts it with Deliveroo straight away", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = generateOrderId("scheduled");

    const calls = await withDeliverooApi(async (recorded) => {
      const response = await postSigned(t, scheduledOrder(orderId, Date.now() + HALF_AN_HOUR));
      expect(response.status).toBe(200);
      return apiCallsExcludingAuth(recorded);
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]!.method).toBe("PATCH");
    expect(calls[0]!.url).toContain(encodeURIComponent(orderId));
    expect(JSON.parse(calls[0]!.body ?? "{}")).toEqual({ status: "accepted" });
  });

  it("parks the confirmation on the scheduler for confirm_at", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = generateOrderId("scheduled");
    const confirmAt = Date.now() + HALF_AN_HOUR;

    await withDeliverooApi(async () => {
      await postSigned(t, scheduledOrder(orderId, confirmAt));
    });

    const jobs = await readScheduledJobs(t);
    expect(jobs, "nothing was scheduled, so the order would never be confirmed").toHaveLength(1);
    expect(jobs[0]!.name).toBe("deliverooWebhook:confirmScheduledOrder");
    // Deliveroo's own time, not a delay we invented: a confirmation sent early
    // is as wrong as one that never comes.
    expect(Math.abs(jobs[0]!.scheduledTime - confirmAt)).toBeLessThan(5_000);
  });

  it("leaves the order pending until that confirmation runs", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = generateOrderId("scheduled");

    await withDeliverooApi(async () => {
      await postSigned(t, scheduledOrder(orderId, Date.now() + HALF_AN_HOUR));
    });

    const [order] = await readOrders(t);
    expect(order!.status).toBe("pending");
  });

  it("sends the ticket to the kitchen now, not at confirm_at", async () => {
    // The food is not made yet, but the pass has to know it is coming — and
    // the ticket is created before the credentials check on purpose, so a
    // scheduled order reaches the kitchen even when Deliveroo is unreachable.
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = generateOrderId("scheduled");

    await withDeliverooApi(async () => {
      await postSigned(t, scheduledOrder(orderId, Date.now() + HALF_AN_HOUR));
    });

    const tickets = await readKitchenTickets(t);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]!.source).toBe("deliveroo");
  });

  it("confirms the order with Deliveroo when the scheduled job runs", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t);
    const orderId = generateOrderId("scheduled");

    const calls = await withDeliverooApi(async (recorded) => {
      await postSigned(t, scheduledOrder(orderId, Date.now() + HALF_AN_HOUR));
      const [order] = await readOrders(t);

      // Run the parked job itself rather than waiting half an hour for the
      // scheduler. It is the same action, with the arguments the handler gave
      // it — the scheduling of it is asserted separately above.
      await t.action(internal.deliverooWebhook.confirmScheduledOrder, {
        orderId,
        internalOrderId: order!._id as Id<"orders">,
      });
      return apiCallsExcludingAuth(recorded);
    });

    const confirm = calls.find((c) => JSON.parse(c.body ?? "{}").status === "confirmed");
    expect(confirm, "the scheduled order was never confirmed with Deliveroo").toBeDefined();
    expect(confirm!.method).toBe("PATCH");

    const [order] = await readOrders(t);
    expect(order!.status).toBe("confirmed");
  });

  it("rejects the order instead of accepting it when the store is on auto_reject", async () => {
    const t = newHarness();
    await seedStoreWithDeliveroo(t, { orderMode: "auto_reject" });
    const orderId = generateOrderId("scheduled");

    const calls = await withDeliverooApi(async (recorded) => {
      await postSigned(t, scheduledOrder(orderId, Date.now() + HALF_AN_HOUR));
      return apiCallsExcludingAuth(recorded);
    });

    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0]!.body ?? "{}")).toMatchObject({ status: "rejected" });
    // Nothing to confirm later: the order was refused.
    expect(await readScheduledJobs(t)).toHaveLength(0);
  });
});
