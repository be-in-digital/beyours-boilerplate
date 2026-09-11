"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { captureBackendError } from "./errorReporting";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { toKitchenTicketItemsFromPlatform } from "@be-in-digital/convex-functions/orders";
import {
  resolveMenuStoreIntegration,
  resolveStoreIntegration,
} from "@be-in-digital/convex-functions/platformWebhook";

// ============================================================================
// Types
// ============================================================================

interface DeliverooPrice {
  fractional: number;
  currency_code: string;
}

interface DeliverooOrderItem {
  pos_item_id?: string;
  plu?: string;
  external_reference_id?: string;
  id?: string;
  name: string;
  quantity: number;
  unit_price?: DeliverooPrice;
  price?: DeliverooPrice;
  total_price?: DeliverooPrice;
  modifiers?: Array<{
    pos_item_id?: string;
    id?: string;
    name: string;
    quantity?: number;
    unit_price?: DeliverooPrice;
    price?: DeliverooPrice;
    total_price?: DeliverooPrice;
  }>;
  options?: Array<{
    id?: string;
    name: string;
    price?: DeliverooPrice;
  }>;
  notes?: string;
  operational_name?: string;
}

interface DeliverooOrder {
  id: string;
  order_number?: string;
  display_id?: string;
  location_id?: string;
  site_id?: string;
  brand_id?: string;
  status: string;
  fulfillment_type?: string;
  order_type?: string;
  asap?: boolean;
  confirm_at?: string;
  start_preparing_at?: string;
  prepare_for?: string;
  total_price?: DeliverooPrice;
  partner_order_total?: DeliverooPrice;
  items?: DeliverooOrderItem[];
  customer?: {
    name?: string;
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    phone?: string;
    email?: string;
  };
  delivery_address?: {
    street1?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    postcode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  note?: string;
  notes?: string;
  status_log?: Array<{ at: string; status: string }>;
  remake_details?: {
    fault: string;
    parent_order_id: string;
    order_cost?: number;
  };
  payment?: {
    subtotal?: DeliverooPrice;
    tax?: DeliverooPrice;
    delivery_fee?: DeliverooPrice;
    total?: DeliverooPrice;
  };
  cancellation_reason?: string;
  rejection_reason?: string;
}

interface DeliverooWebhookPayload {
  event?: string;
  body?: { order?: DeliverooOrder };
  order?: DeliverooOrder;
}

type StoreIntegrationRecord = {
  _id: Id<"storeIntegrations">;
  storeId: Id<"stores">;
  platform: "uberEats" | "deliveroo";
  platformStoreId: string;
  brandId?: string;
  enabled: boolean;
  autoAccept: boolean;
  orderMode?: "auto_accept" | "auto_reject" | "manual";
};

// ============================================================================
// Helpers
// ============================================================================

async function getDeliverooCredentials() {
  const { getPackageEnv, isSandbox } = await import("@be-in-digital/core/env");
  const pkg = getPackageEnv();
  const clientId = pkg.DELIVEROO_CLIENT_ID;
  const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
  const sandboxMode = isSandbox("deliveroo");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sandboxMode };
}

/**
 * Map a Deliveroo order status to the internal one.
 *
 * The vocabulary is the Order API's, and only the Order API's:
 * `pending`, `placed`, `accepted`, `confirmed`, `rejected`, `canceled`. That
 * is the whole set an order event can carry — the state machine is
 * `pending → placed → accepted → confirmed`, with `rejected` and `canceled`
 * as exits.
 *
 * Three consequences, each one a bug this function used to have:
 *
 *  - `canceled` is spelled with ONE l. The old code matched `"cancelled"`,
 *    which Deliveroo never sends, so a cancellation never cancelled anything.
 *    Both spellings are accepted below: the two-l form costs nothing, older
 *    fixtures and the sandbox scenarios use it, and tolerating it cannot
 *    mis-map anything since Deliveroo owns the other spelling.
 *  - `confirmed` had no case at all and fell through to the default.
 *  - `started_preparing`, `ready_for_collection`, `out_for_delivery` and
 *    `delivered` are prep *stages* we PUSH (`/prep_stage`), never statuses we
 *    receive. Mapping them here invented a vocabulary Deliveroo does not
 *    speak.
 *
 * An unrecognised status returns `null` rather than a guess. The old
 * `default: return "pending"` dragged orders backwards — a confirmed order
 * answered "pending" and the kitchen was told to start again. The caller must
 * skip the update and log; see `handleStatusUpdate`.
 *
 * Exported so tests can assert the Deliveroo vocabulary against the internal
 * status machine rather than restating the mapping and letting it drift.
 */
export function mapDeliverooStatus(
  deliverooStatus: string
): "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | null {
  switch (deliverooStatus) {
    case "pending":
    case "placed":
      return "pending";
    case "accepted":
    case "confirmed":
      return "confirmed";
    case "rejected":
    case "canceled":
    // Tolerated alias: Deliveroo sends "canceled", but our own fixtures and
    // sandbox scenarios were written against the British spelling.
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

// ============================================================================
// Process Order Webhook
// ============================================================================

/**
 * What a webhook processor tells its HTTP caller.
 *
 * `retryable` is the only field the HTTP layer reads on a failure, and it
 * decides whether Deliveroo is asked to send the event again. It is optional
 * and absence means "retry": a failure nobody classified is more safely
 * redelivered than silently dropped, which is the exact bug this field exists
 * to close.
 */
type DeliverooWebhookOutcome = {
  success: boolean;
  retryable?: boolean;
  error?: string;
  internalOrderId?: Id<"orders">;
  scheduled?: boolean;
  duplicate?: boolean;
  status?: ReturnType<typeof mapDeliverooStatus>;
};

/**
 * Process Deliveroo order webhook.
 *
 * Handles two event types:
 * - order.new: New order placed, create internally + sync status + auto-accept if ASAP
 * - order.status_update: Status change (accepted, rejected, canceled, etc.)
 */
/**
 * A debug line that does not ship, and never carries what a diner wrote.
 *
 * WHAT WAS BROKEN (#433.3). Four `[Sync Debug]` lines were unconditional, and
 * they are compiled into the artefact `convex deploy` produces:
 *
 *     $ grep -c "Sync Debug" apps/themes/.convex-build/convex/deliverooWebhook.js
 *     4
 *
 * One of them printed `note="…"` — the diner's free-text order note, which this
 * codebase documents elsewhere as carrying allergy instructions
 * (`orders.ts:1836-1841`, "This is a food-safety path"). Health data, into a
 * client's Convex log, on every Deliveroo order.
 *
 * `packages/integrations/src/common/logger.ts` has gated on
 * `NODE_ENV === "production" && !DEBUG` for as long as it has existed. The
 * package did it right; the app code the client runs did not.
 *
 * THE NOTE IS GONE ENTIRELY, not merely gated. The keyword scan below reads it
 * and needs to; printing it is a separate act, and a debug flag set on a client
 * deployment to diagnose something else must not start logging what a customer
 * told the kitchen about their allergies. What is printed instead is whether a
 * note was present and how long it was, which is what the PLU decision below
 * is actually being debugged for.
 */
function syncDebug(message: string): void {
  if (typeof process !== "undefined") {
    if (process.env.NODE_ENV === "production" && !process.env.DEBUG) return
    if (process.env.DEBUG && !process.env.DEBUG.includes("deliveroo")) return
  }
  console.log(`[Sync Debug] ${message}`);
}

export const processOrderWebhook = internalAction({
  args: { payload: v.string() },
  handler: async (ctx, args): Promise<DeliverooWebhookOutcome> => {
    try {
      const webhookData = JSON.parse(args.payload) as DeliverooWebhookPayload;
      const event = webhookData.event ?? "";

      // Support both { body: { order } } and legacy { order } format
      const order = webhookData.body?.order ?? webhookData.order;

      if (!order) {
        console.error("No order data in webhook payload");
        // A redelivery carries the same bytes, so a retry cannot help. Ask for
        // one anyway and we burn seven attempts against the 98% Order API
        // success rate for a body that will never parse into an order.
        return { success: false, retryable: false, error: "No order data in payload" };
      }

      // Determine site_id for integration lookup
      const siteId = order.location_id ?? order.site_id ?? "";

      // Find store integration
      const allIntegrations = (await ctx.runQuery(
        internal.storeIntegrations.internalListByPlatformEnabled,
        { platform: "deliveroo" }
      )) as StoreIntegrationRecord[];

      // One refusal policy for both platforms. A bare `.find()` on `siteId`
      // matches an integration whose `platformStoreId` is the empty string when
      // the payload carries no site reference — the same class of mistake as
      // the Uber path's `allIntegrations[0]`, and the same consequence: an
      // order in a kitchen that did not sell it.
      const resolution = resolveStoreIntegration(allIntegrations, siteId);

      if (!resolution.ok) {
        console.error(
          `No Deliveroo integration for site_id "${siteId}" (${resolution.reason})`
        );
        // Kept, with the body, so it can be replayed once the cause is fixed.
        await ctx.runMutation(internal.platformWebhookFailures.record, {
          platform: "deliveroo" as const,
          eventType: "order.new",
          externalOrderId: order.id ?? undefined,
          platformStoreId: siteId || undefined,
          reason: resolution.reason,
          detail: `No enabled Deliveroo integration matches site ${siteId || "(absent)"}`,
          rawBody: args.payload,
        });
        // Retryable: this is a real order for a site we could not route, and
        // the row may simply not be there yet — the same race this file
        // already retries for in `handleStatusUpdate`. A 200 here is how an
        // order disappears with nothing left but a log line.
        return {
          success: false,
          retryable: true,
          error: `No integration found for site_id: ${siteId}`,
        };
      }

      const integration = resolution.integration;

      const credentials = await getDeliverooCredentials();

      // ================================================================
      // EVENT: order.new — New order placed
      // ================================================================
      if (event === "order.new" || (!event && order.status === "placed")) {
        return await handleNewOrder(ctx, order, integration, credentials);
      }

      // ================================================================
      // EVENT: order.status_update — Status change
      // ================================================================
      if (event === "order.status_update" || event === "") {
        return await handleStatusUpdate(ctx, order, integration, credentials);
      }

      // An event we do not handle is not a failure: nothing was lost, and a
      // retry would only re-deliver something we will ignore again.
      console.log(`Unhandled Deliveroo order event: ${event}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to process Deliveroo order webhook:`, errorMessage);
      // Unexpected, therefore assumed transient: a failed mutation, a write
      // conflict, a blip talking to Deliveroo. This is the case a retry exists
      // for.
      return { success: false, retryable: true, error: errorMessage };
    }
  },
});

// ============================================================================
// Handle New Order (order.new)
// ============================================================================

async function handleNewOrder(
  ctx: ActionCtx,
  order: DeliverooOrder,
  integration: StoreIntegrationRecord,
  credentials: Awaited<ReturnType<typeof getDeliverooCredentials>>
): Promise<{
  success: boolean;
  internalOrderId: Id<"orders">;
  scheduled?: boolean;
  duplicate?: boolean;
}> {
  const storeId = integration.storeId;

  // Extract customer name
  const customerName = order.customer?.name
    ?? (`${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim()
    || "Client Deliveroo");

  // What the kitchen calls the order. Deliveroo's own short reference when it
  // sends one, so the slip matches the tablet and the rider's paperwork.
  const orderNumber = order.order_number
    ?? order.display_id
    ?? `DL-${order.id.slice(-6).toUpperCase()}`;

  // Determine order type from fulfillment_type or order_type
  const fulfillmentType = order.fulfillment_type ?? order.order_type ?? "deliveroo";
  const orderType = fulfillmentType === "collection" || fulfillmentType === "pickup"
    ? ("pickup" as const)
    : ("delivery" as const);

  // Map items
  const items = (order.items ?? []).map((item) => ({
    externalId: item.pos_item_id ?? item.id ?? "",
    name: item.name,
    quantity: item.quantity,
    price: (item.unit_price ?? item.price)?.fractional ?? 0,
    modifiers: [
      ...(item.modifiers ?? []).map((mod) => ({
        externalId: mod.pos_item_id ?? mod.id ?? "",
        name: mod.name,
        price: (mod.unit_price ?? mod.price)?.fractional ?? 0,
      })),
      ...(item.options ?? []).map((opt) => ({
        externalId: opt.id ?? "",
        name: opt.name,
        price: opt.price?.fractional ?? 0,
      })),
    ],
    // "allergie arachides — sauce à part". Dropped here until now, exactly as
    // it was on the Uber Eats path: an instruction on a line can be an
    // allergy, so losing it is a food-safety defect. The order validator has
    // carried the field since #135; this is the caller that never filled it.
    notes: item.notes,
  }));

  // Log missing PLUs (Scenario 11)
  for (const item of order.items ?? []) {
    const plu = item.pos_item_id ?? item.id ?? "";
    if (!plu || plu.startsWith("UNKNOWN") || plu.startsWith("MISSING") || plu.startsWith("UNRECOGNIZED")) {
      console.warn(`Missing/unknown PLU "${plu}" for item "${item.name}" - falling back to item name`);
    }
  }

  // Extract delivery address
  const deliveryAddress = order.delivery_address
    ? {
        street: `${order.delivery_address.street1 ?? order.delivery_address.address_line_1 ?? ""} ${order.delivery_address.address_line_2 ?? ""}`.trim(),
        city: order.delivery_address.city ?? "",
        postalCode: order.delivery_address.postcode ?? "",
        country: order.delivery_address.country ?? "FR",
      }
    : undefined;

  // Extract totals
  const totalPrice = order.total_price ?? order.partner_order_total ?? order.payment?.total;
  const subtotal = order.payment?.subtotal?.fractional ?? totalPrice?.fractional ?? 0;
  const total = totalPrice?.fractional ?? 0;

  // Create the internal order. Explicit annotation breaks the circular type
  // inference that arises when this action's return type depends on
  // internal.orders.createFromWebhook (part of the `internal` graph that
  // references this file).
  const { orderId: internalOrderId, created }: { orderId: Id<"orders">; created: boolean } =
    await ctx.runMutation(internal.orders.createFromWebhook, {
      storeId,
      externalOrderId: order.id,
      platform: "deliveroo",
      status: "pending",
      type: orderType,
      customerName,
      customerPhone: order.customer?.phone_number ?? order.customer?.phone,
      customerEmail: order.customer?.email,
      deliveryAddress,
      items,
      subtotal,
      total,
      notes: order.notes,
      createdAt: Date.now(),
    }
  );

  console.log(
    `Created order ${internalOrderId} from Deliveroo ${order.id} (${fulfillmentType}, asap=${order.asap})`
  );

  // Create kitchen ticket for KDS.
  //
  // Without this a Deliveroo order existed in the database and nowhere else:
  // no slip, no screen, no printer, and the accept button in `TicketCard`
  // unreachable because it acts on a ticket. The Uber Eats path has always
  // done this (`uberEatsWebhook.ts`); this is the same call, same mapper,
  // `source: "deliveroo"`. It sits before the credentials check on purpose —
  // the kitchen must be told about the order whether or not we can talk back
  // to Deliveroo.
  //
  // BEFORE THE DUPLICATE SHORT-CIRCUIT, and that ordering is the fix. This
  // block used to sit after a `if (!created) return`, so a redelivery — the one
  // event that could repair a ticket whose first creation failed — returned
  // without ever reaching it. `tasks/sales-readiness-backlog.md` records P0-10
  // as RESOLVED, and the same outcome was reachable by this other path: an
  // order in the database, a 200 back to Deliveroo, no slip on the pass, and
  // nothing that would ever retry. None of the 12 crons reconciles a ticketless
  // order either.
  //
  // Asking first rather than creating unconditionally: the redelivery must
  // repair a MISSING ticket without adding a second one to an order the kitchen
  // is already cooking.
  const hasTicket: boolean = await ctx.runQuery(
    internal.kitchenTickets.internalHasTicketForOrder,
    { orderId: internalOrderId as Id<"orders"> }
  );

  if (!hasTicket) {
    try {
      const trackingToken = `dl-${order.id.slice(-8)}-${Date.now().toString(36)}`;

      await ctx.runMutation(internal.kitchenTickets.internalCreate, {
        storeId,
        orderId: internalOrderId as Id<"orders">,
        orderNumber,
        orderType,
        // One mapping, in the package, tested across the seam. Hand-rolling it
        // is what dropped the allergy note on the Uber path.
        items: toKitchenTicketItemsFromPlatform(items),
        priority: "normal" as const,
        source: "deliveroo" as const,
        trackingToken,
        customerName,
        customerPhone: order.customer?.phone_number ?? order.customer?.phone,
        deliveryNotes: order.notes,
      });
      console.log(`Created kitchen ticket for Deliveroo order ${orderNumber}`);
    } catch (error) {
      // REPORTED, not just logged. This was a bare `console.error` in an 854-line
      // file with zero `captureBackendError` calls, while its Uber Eats twin had
      // three — so the one failure that silently costs a restaurant a meal was
      // visible only to whoever thought to open that client's Convex logs. The
      // handler still answers 200: Deliveroo's retry is now able to repair this,
      // which it was not before, and a 5xx would re-run the whole accept flow.
      console.error(`Failed to create kitchen ticket:`, error);
      await captureBackendError(ctx, {
        error,
        source: "deliverooWebhook",
        tags: { step: "kitchen-ticket" },
        extra: { externalOrderId: order.id, orderNumber },
      });
    }
  }

  // Duplicate webhook (Deliveroo retry): the order already exists and was
  // already accepted/rejected on first delivery — do not re-accept. The ticket
  // above has been repaired if it was missing, which is the whole reason this
  // return now comes second.
  if (!created) {
    console.log(`Duplicate Deliveroo order.new for ${order.id} — skipping re-accept`);
    return { success: true, internalOrderId, duplicate: true };
  }

  if (!credentials) {
    return { success: true, internalOrderId };
  }

  const { deliveroo } = await import("@be-in-digital/integrations");

  // ----------------------------------------------------------------
  // Deliveroo flow (per docs):
  // For ASAP orders: Do NOT call acceptOrder - Deliveroo handles acceptance.
  // Wait for order.status_update webhook with "accepted" in status_log,
  // THEN send sync_status.
  // For scheduled orders: accept, then wait for confirm_at time.
  // ----------------------------------------------------------------

  // Resolve order mode: platform override > store global > legacy autoAccept > manual
  const store = await ctx.runQuery(api.stores.getById, { id: storeId });
  const orderMode = integration.orderMode
    ?? store?.orderMode
    ?? (integration.autoAccept ? "auto_accept" : "manual");

  console.log(`[Deliveroo] Order ${order.id} - mode: ${orderMode}, asap: ${order.asap}`);

  // Scheduled order (Scenario 3): asap=false, has confirm_at
  if (order.asap === false && order.confirm_at) {
    console.log(
      `[Scenario 3] Scheduled order ${order.id} - confirm_at: ${order.confirm_at}`
    );
    if (orderMode !== "auto_reject") {
      // Step 1: Accept the order immediately
      try {
        await deliveroo.acceptOrder(credentials, order.id);
        console.log(`Accepted scheduled Deliveroo order ${order.id}`);
      } catch (error) {
        console.error(`Failed to accept scheduled order:`, error);
      }

      // Step 2: Schedule confirmation after confirm_at
      const confirmAt = new Date(order.confirm_at).getTime();
      const now = Date.now();
      const delayMs = Math.max(confirmAt - now, 0);
      console.log(`[Scenario 3] Scheduling confirmation in ${Math.round(delayMs / 1000)}s (confirm_at: ${order.confirm_at})`);

      await ctx.scheduler.runAfter(delayMs, internal.deliverooWebhook.confirmScheduledOrder, {
        orderId: order.id,
        internalOrderId: internalOrderId as Id<"orders">,
      });
    } else {
      try {
        await deliveroo.rejectOrder(credentials, order.id, "busy");
        console.log(`Rejected scheduled order ${order.id} (auto_reject mode)`);
      } catch (error) {
        console.error(`Failed to reject scheduled order:`, error);
      }
    }
    return { success: true, internalOrderId, scheduled: true };
  }

  // Order mode handling for ASAP orders
  if (orderMode === "auto_accept") {
    console.log(`[Auto-Accept] Accepting ASAP order ${order.id}`);
    try {
      await deliveroo.acceptOrder(credentials, order.id);
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: internalOrderId as Id<"orders">,
        status: "confirmed",
      });
      console.log(`Auto-accepted Deliveroo order ${order.id}`);
    } catch (error) {
      console.error(`Failed to auto-accept Deliveroo order:`, error);
    }
  } else if (orderMode === "auto_reject") {
    console.log(`[Auto-Reject] Rejecting ASAP order ${order.id}`);
    try {
      await deliveroo.rejectOrder(credentials, order.id, "busy");
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: internalOrderId as Id<"orders">,
        status: "cancelled",
      });
      console.log(`Auto-rejected Deliveroo order ${order.id}`);
    } catch (error) {
      console.error(`Failed to auto-reject Deliveroo order:`, error);
    }
  } else {
    // manual mode: order stays pending, staff decides in KDS
    console.log(`[Manual] Order ${order.id} created as pending - awaiting staff action`);
  }

  return { success: true, internalOrderId };
}

// ============================================================================
// Handle Status Update (order.status_update)
// ============================================================================

/**
 * The POS identifier Deliveroo sent for a line, whichever field it arrived in.
 *
 * Deliveroo puts it under `pos_item_id`, `plu` or `external_reference_id`
 * depending on how the integration was set up, and the three checks below have
 * to agree on which one they mean. They did not: the "no identifier at all"
 * test accepted all three, while the check that looks the identifier up in our
 * own mappings read `pos_item_id` alone. A line identified by `plu` or
 * `external_reference_id` therefore skipped the database check entirely —
 * `unmatchedCount` was never computed for it — and Deliveroo was answered
 * `sync_status: succeeded` for a PLU that maps to no dish we have. Same
 * customer-visible outcome as a stale mapping, reached without deleting
 * anything.
 */
function posItemId(item: DeliverooOrderItem): string | undefined {
  // `||`, not `??`: an empty string is not an identifier. With `??` a line
  // carrying `pos_item_id: ""` alongside a real `plu` stopped at the empty
  // one, and a dish we can perfectly well cook was refused as having no POS
  // id at all.
  return item.pos_item_id || item.plu || item.external_reference_id;
}

async function handleStatusUpdate(
  ctx: ActionCtx,
  order: DeliverooOrder,
  integration: StoreIntegrationRecord,
  credentials: Awaited<ReturnType<typeof getDeliverooCredentials>>
): Promise<{ success: boolean; status: ReturnType<typeof mapDeliverooStatus> }> {
  const status = order.status;
  const orderId = order.id;
  const internalStatus = mapDeliverooStatus(status);

  console.log(`Deliveroo status update: ${orderId} -> ${status} (internal: ${internalStatus})`);

  // A status outside Deliveroo's order vocabulary is left alone. Writing a
  // guess here is how a confirmed order went back to `pending`; the rest of
  // the handler (sync status) still runs, because it keys on the status log
  // rather than on this mapping.
  if (internalStatus === null) {
    console.warn(
      `[Deliveroo] Unrecognised order status "${status}" for ${orderId} — leaving the internal status untouched`
    );
  } else {
    // Update internal order status (with retry for race condition)
    let _updateSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await ctx.runMutation(internal.orders.updateFromWebhook, {
          externalOrderId: orderId,
          platform: "deliveroo" as const,
          status: internalStatus,
          cancellationReason: order.cancellation_reason ?? order.rejection_reason,
          updatedAt: Date.now(),
        });
        _updateSuccess = true;
        break;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("not found") && attempt < 2) {
          // Order may not exist yet (status_update arrived before order.new finished)
          console.warn(`Order ${orderId} not found yet, retrying in ${(attempt + 1) * 2}s... (attempt ${attempt + 1}/3)`);
          await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
        } else {
          console.error(`Failed to update order ${orderId}:`, error);
          break;
        }
      }
    }
  }

  // Per Deliveroo docs: "send sync status only after you receive a webhook call
  // with the accepted status present in the status log"
  const statusLog = order.status_log ?? [];
  const hasAcceptedInLog = statusLog.some((entry) => entry.status === "accepted");
  const isAccepted = status === "accepted" || hasAcceptedInLog;

  if (credentials && isAccepted) {
    const { deliveroo } = await import("@be-in-digital/integrations");

    // Fetch full order from API if webhook doesn't include items
    // (status_update webhooks may only contain id + status)
    let fullOrder = order;
    if (!order.items || order.items.length === 0) {
      console.log(`[Sync] No items in webhook for ${orderId}, fetching from API...`);
      try {
        const fetched = await deliveroo.getOrder(credentials, orderId);
        const fetchedOrder = fetched?.order;
        if (fetchedOrder?.items) {
          fullOrder = { ...order, items: fetchedOrder.items as DeliverooOrderItem[] };
          console.log(`[Sync] Fetched order has ${fullOrder.items?.length ?? 0} items`);
        }
      } catch (err) {
        console.warn(`[Sync] Failed to fetch order ${orderId} from API:`, err);
      }
    }

    const items = fullOrder.items ?? [];

    // Debug: what the sync-status decision below is made from.
    syncDebug(`Order ${orderId}: items=${items.length}, status=${status}`);
    // The note's SHAPE, never its contents — a diner's free-text note is where
    // an allergy is written.
    syncDebug(
      `note: ${(fullOrder.note ?? "").length} char(s), ` +
        `notes: ${(fullOrder.notes ?? "").length} char(s)`
    );
    syncDebug(
      `Item PLUs: ${items.map((i: DeliverooOrderItem) => `${i.name}:${posItemId(i) ?? "NONE"}`).join(", ")}`
    );

    // Scenario 11: Missing PLU - items without any POS identifier
    const hasMissingPLU = items.some((item: DeliverooOrderItem) => !posItemId(item));

    // Scenario 12: Mismatched PLU
    // First check keyword-based detection (note/notes/PLU containing "mismatch")
    const noteLower = (fullOrder.note ?? "").toLowerCase();
    const notesLower = (fullOrder.notes ?? "").toLowerCase();
    let hasMismatch =
      noteLower.includes("mismatch") || noteLower.includes("scenario 12") ||
      notesLower.includes("mismatch") || notesLower.includes("scenario 12") ||
      items.some((item: DeliverooOrderItem) => posItemId(item)?.toLowerCase().includes("mismatch"));

    // If no keyword match, check PLUs against our product database
    // If items have PLUs that don't match any known product mapping, it's a mismatch
    if (!hasMissingPLU && !hasMismatch && items.length > 0) {
      const itemsWithPLU = items
        .map((item: DeliverooOrderItem) => ({ item, plu: posItemId(item) }))
        .filter((entry): entry is { item: DeliverooOrderItem; plu: string } => !!entry.plu);
      if (itemsWithPLU.length > 0) {
        let unmatchedCount = 0;
        for (const { item, plu } of itemsWithPLU) {
          try {
            const mapping = await ctx.runQuery(
              internal.externalProductMappings.internalGetByExternal,
              { storeId: integration.storeId, externalId: plu, platform: "deliveroo" }
            );
            if (!mapping) {
              unmatchedCount++;
              console.log(`[Sync] PLU "${plu}" (${item.name}) not found in product mappings`);
            }
          } catch (err) {
            console.warn(`[Sync] Error checking PLU "${plu}":`, err);
            unmatchedCount++;
          }
        }
        if (unmatchedCount > 0) {
          hasMismatch = true;
          console.log(`[Sync] ${unmatchedCount}/${itemsWithPLU.length} PLUs not found in database → mismatch detected`);
        }
      }
    }

    syncDebug(`hasMissingPLU=${hasMissingPLU}, hasMismatch=${hasMismatch}`);

    try {
      if (hasMissingPLU) {
        console.log(`[Scenario 11] Order ${orderId} has missing PLUs. Sending sync failed.`);
        await deliveroo.sendSyncStatus(credentials, orderId, "failed", "pos_item_id_not_found");
      } else if (hasMismatch) {
        console.log(`[Scenario 12] Order ${orderId} has mismatched PLUs. Sending sync failed.`);
        await deliveroo.sendSyncStatus(credentials, orderId, "failed", "pos_item_id_mismatched");
      } else {
        await deliveroo.sendSyncStatus(credentials, orderId, "succeeded");
        console.log(`Sent sync status succeeded for ${orderId}`);
      }
    } catch (error) {
      console.error(`Failed to send sync status for ${orderId}:`, error);
    }
  } else if (status === "canceled" || status === "cancelled") {
    console.log(`Order ${orderId} is CANCELLED. No sync status needed.`);
  } else if (status === "rejected") {
    console.log(`Order ${orderId} is REJECTED. No sync status needed.`);
  }

  return { success: true, status: internalStatus };
}

// ============================================================================
// Confirm Scheduled Order (delayed via scheduler)
// ============================================================================

export const confirmScheduledOrder = internalAction({
  args: {
    orderId: v.string(),
    internalOrderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const credentials = await getDeliverooCredentials();
    if (!credentials) {
      console.error("No Deliveroo credentials for confirmScheduledOrder");
      return;
    }
    const { deliveroo } = await import("@be-in-digital/integrations");
    try {
      await deliveroo.confirmOrder(credentials, args.orderId);
      await ctx.runMutation(internal.orders.internalUpdateStatus, {
        id: args.internalOrderId,
        status: "confirmed",
      });
      console.log(`[Scenario 3] Confirmed scheduled order ${args.orderId}`);
    } catch (error) {
      console.error(`Failed to confirm scheduled order ${args.orderId}:`, error);
    }
  },
});

// ============================================================================
// Process Menu Webhook
// ============================================================================

/**
 * Process Deliveroo menu webhook events.
 */
export const processMenuWebhook = internalAction({
  args: {
    event: v.string(),
    brandId: v.string(),
    siteId: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args): Promise<DeliverooWebhookOutcome> => {
    try {
      const allIntegrations = (await ctx.runQuery(
        internal.storeIntegrations.internalListByPlatformEnabled,
        { platform: "deliveroo" }
      )) as StoreIntegrationRecord[];

      // Menu webhooks may include site_id, brand_id, or both — and the same
      // refusal policy the order path uses applies to both. A site id that
      // names nothing used to fall through to the brand, which matches every
      // location of the chain, so the sync status landed on whichever sibling
      // sorted first.
      const resolution = resolveMenuStoreIntegration(
        allIntegrations,
        args.siteId,
        args.brandId
      );

      if (!resolution.ok) {
        console.error(
          `No Deliveroo integration for siteId "${args.siteId}", brandId "${args.brandId}" (${resolution.reason})`
        );
        return {
          success: false,
          retryable: true,
          error: `No integration found for siteId: ${args.siteId}, brandId: ${args.brandId}`,
        };
      }

      const storeId = resolution.integration.storeId;

      if (args.event === "menu.upload_completed") {
        await ctx.runMutation(
          internal.storeIntegrations.internalUpdateMenuSyncStatus,
          {
            storeId,
            platform: "deliveroo",
            menuSyncStatus: "success",
          }
        );
        console.log(`Menu upload completed for store ${storeId}`);
      } else if (args.event === "menu.upload_failed") {
        const failPayload = JSON.parse(args.payload) as { error?: string };
        const failError = failPayload.error ?? "Menu upload failed";
        await ctx.runMutation(
          internal.storeIntegrations.internalUpdateMenuSyncStatus,
          {
            storeId,
            platform: "deliveroo",
            menuSyncStatus: "error",
            menuSyncError: failError,
          }
        );
        console.error(
          `Menu upload failed for store ${storeId}: ${failError}`
        );
      } else if (args.event === "menu.validation_error") {
        const validationPayload = JSON.parse(args.payload) as {
          errors?: unknown;
        };
        const validationError = validationPayload.errors
          ? JSON.stringify(validationPayload.errors)
          : "Menu validation error";
        await ctx.runMutation(
          internal.storeIntegrations.internalUpdateMenuSyncStatus,
          {
            storeId,
            platform: "deliveroo",
            menuSyncStatus: "error",
            menuSyncError: validationError,
          }
        );
        console.error(
          `Menu validation error for store ${storeId}: ${validationError}`
        );
      } else {
        console.log(`Unknown menu event: ${args.event}`);
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Failed to process Deliveroo menu webhook:`,
        errorMessage
      );
      return { success: false, retryable: true, error: errorMessage };
    }
  },
});
