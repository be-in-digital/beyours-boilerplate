/**
 * Settling a charge on a RETURN PAGE, and saying so when we refuse one.
 *
 * WHY THIS EXISTS. Six code paths in this deployment settle a provider payment.
 * `stripeWebhook.ts` and `payments.settleFromChargeEvent` are driven by the
 * provider and record a refusal where an operator reads it; the reconciliation
 * sweep does the same since #438. The other three — the pages a diner is sent
 * back to after paying, one per provider — did not.
 *
 * They are the paths that fire FIRST. A diner completes a Stripe checkout and
 * their browser hits `verifyCheckoutSession` seconds later, well before the
 * webhook lands. If the settlement is refused there — the amount no longer
 * binds, the order was already collected by another charge (#378, #411) — the
 * refusal was thrown out of the action, the page showed an error, and nothing
 * anywhere recorded that a charge had been taken and not banked. Measured on
 * the bench: 2 400 c taken, 1 200 c on the ledger, `FA-2026-000001` minted
 * against it, and zero `payment_collection_refused` rows.
 *
 * A refusal is not a failure. The provider does not report a charge it did not
 * take, so by the time we refuse, the diner's account is already debited.
 * Refusing the row keeps the LEDGER honest; this is the half that makes
 * somebody give the money back.
 *
 * The recording never replaces the refusal: the error is rethrown, so the
 * caller's own error path — the one that tells the diner something went wrong —
 * behaves exactly as it did. And a failure to write the audit row must not
 * swallow the refusal it was describing, which is why the write is `.catch`ed.
 * Same rule `recordRefusedCollection` follows in the engine, for the same
 * reason.
 */

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { deliberateSettlementRefusal } from "@be-in-digital/convex-functions/paymentSettlement";

/** What a return page hands `internalSettle`, plus where the refusal came from. */
export interface ReturnSettlement {
  orderId: Id<"orders">;
  storeId: Id<"stores">;
  amount: number;
  currency: string;
  provider: "stripe" | "sumup" | "paypal";
  externalId: string;
}

/**
 * Record the payment, or record that this deployment refused to.
 *
 * Call it where `internal.payments.internalSettle` was called, and call it
 * BEFORE the order's `paymentStatus` is written. Those are two transactions:
 * marking the order paid first commits it, and a refusal here then leaves the
 * order reading « Payé » with nothing on the ledger behind it.
 */
export async function settleOrRecordRefusal(
  ctx: ActionCtx,
  settlement: ReturnSettlement
): Promise<void> {
  try {
    await ctx.runMutation(internal.payments.internalSettle, settlement);
  } catch (error) {
    const refusal = deliberateSettlementRefusal(error);
    if (refusal) {
      console.error(
        `[${settlement.provider}] refused settlement for order ${settlement.orderId} ` +
          `(${refusal.code}): ${refusal.message}`
      );
      await ctx
        .runMutation(internal.payments.internalRecordRefusedCollection, {
          provider: settlement.provider,
          code: refusal.code,
          message: refusal.message,
          eventType: `${settlement.provider}.return`,
          externalId: settlement.externalId,
          orderId: settlement.orderId,
          storeId: settlement.storeId,
        })
        .catch(() => undefined);
    }
    throw error;
  }
}
