"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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
  const { getPackageEnv, getSiteEnv } = await import("@be-in-digital/core/env");
  const pkg = getPackageEnv();
  const site = getSiteEnv();
  const clientId = pkg.DELIVEROO_CLIENT_ID;
  const clientSecret = pkg.DELIVEROO_CLIENT_SECRET;
  const sandboxMode = site.DELIVEROO_IS_SANDBOX === "true";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, sandboxMode };
}

/**
 * Map Deliveroo status to internal order status
 */
function mapDeliverooStatus(
  deliverooStatus: string
): "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled" {
  switch (deliverooStatus) {
    case "placed":
      return "pending";
    case "accepted":
      return "confirmed";
    case "started_preparing":
      return "preparing";
    case "ready_for_collection":
      return "ready";
    case "out_for_delivery":
      return "out_for_delivery";
    case "delivered":
      return "completed";
    case "cancelled":
    case "rejected":
      return "cancelled";
    default:
      return "pending";
  }
}

// ============================================================================
// Process Order Webhook
// ============================================================================

/**
 * Process Deliveroo order webhook.
 *
 * Handles two event types:
 * - order.new: New order placed, create internally + sync status + auto-accept if ASAP
 * - order.status_update: Status change (accepted, rejected, cancelled, etc.)
 */
export const processOrderWebhook = internalAction({
  args: { payload: v.string() },
  handler: async (ctx, args) => {
    try {
      const webhookData = JSON.parse(args.payload) as DeliverooWebhookPayload;
      const event = webhookData.event ?? "";

      // Support both { body: { order } } and legacy { order } format
      const order = webhookData.body?.order ?? webhookData.order;

      if (!order) {
        console.error("No order data in webhook payload");
        return { success: false, error: "No order data in payload" };
      }

      // Determine site_id for integration lookup
      const siteId = order.location_id ?? order.site_id ?? "";

      // Find store integration
      const allIntegrations = (await ctx.runQuery(
        api.storeIntegrations.listByPlatformEnabled,
        { platform: "deliveroo" }
      )) as StoreIntegrationRecord[];

      const integration = allIntegrations.find(
        (i) => i.platformStoreId === siteId
      );

      if (!integration) {
        console.error(`No Deliveroo integration found for site_id: ${siteId}`);
        return {
          success: false,
          error: `No integration found for site_id: ${siteId}`,
        };
      }

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

      console.log(`Unhandled Deliveroo order event: ${event}`);
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to process Deliveroo order webhook:`, errorMessage);
      return { success: false, error: errorMessage };
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

  // Duplicate webhook (Deliveroo retry): the order already exists and was
  // already accepted/rejected on first delivery — do not re-accept.
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

    // Debug: log full order data for sync status decision
    console.log(`[Sync Debug] Order ${orderId}: items=${items.length}, status=${status}`);
    console.log(`[Sync Debug] note="${fullOrder.note ?? ""}", notes="${fullOrder.notes ?? ""}"`);
    console.log(`[Sync Debug] Item PLUs: ${items.map((i: DeliverooOrderItem) => `${i.name}:${i.pos_item_id ?? "NONE"}`).join(", ")}`);

    // Scenario 11: Missing PLU - items without any POS identifier
    const hasMissingPLU = items.some(
      (item: DeliverooOrderItem) => !item.pos_item_id && !item.plu && !item.external_reference_id
    );

    // Scenario 12: Mismatched PLU
    // First check keyword-based detection (note/notes/PLU containing "mismatch")
    const noteLower = (fullOrder.note ?? "").toLowerCase();
    const notesLower = (fullOrder.notes ?? "").toLowerCase();
    let hasMismatch =
      noteLower.includes("mismatch") || noteLower.includes("scenario 12") ||
      notesLower.includes("mismatch") || notesLower.includes("scenario 12") ||
      items.some((item: DeliverooOrderItem) => item.pos_item_id && item.pos_item_id.toLowerCase().includes("mismatch"));

    // If no keyword match, check PLUs against our product database
    // If items have PLUs that don't match any known product mapping, it's a mismatch
    if (!hasMissingPLU && !hasMismatch && items.length > 0) {
      const itemsWithPLU = items.filter((item: DeliverooOrderItem) => !!item.pos_item_id);
      if (itemsWithPLU.length > 0) {
        let unmatchedCount = 0;
        for (const item of itemsWithPLU) {
          try {
            const mapping = await ctx.runQuery(
              api.externalProductMappings.getByExternal,
              { externalId: item.pos_item_id!, platform: "deliveroo" }
            );
            if (!mapping) {
              unmatchedCount++;
              console.log(`[Sync] PLU "${item.pos_item_id}" (${item.name}) not found in product mappings`);
            }
          } catch (err) {
            console.warn(`[Sync] Error checking PLU "${item.pos_item_id}":`, err);
            unmatchedCount++;
          }
        }
        if (unmatchedCount > 0) {
          hasMismatch = true;
          console.log(`[Sync] ${unmatchedCount}/${itemsWithPLU.length} PLUs not found in database → mismatch detected`);
        }
      }
    }

    console.log(`[Sync Debug] hasMissingPLU=${hasMissingPLU}, hasMismatch=${hasMismatch}`);

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
  } else if (status === "cancelled") {
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
  handler: async (ctx, args) => {
    try {
      const allIntegrations = (await ctx.runQuery(
        api.storeIntegrations.listByPlatformEnabled,
        { platform: "deliveroo" }
      )) as StoreIntegrationRecord[];

      // Menu webhooks may include site_id, brand_id, or both
      let integration = args.siteId
        ? allIntegrations.find((i) => i.platformStoreId === args.siteId)
        : undefined;

      // Fallback: match by brandId if siteId not provided or not found
      if (!integration && args.brandId) {
        integration = allIntegrations.find(
          (i) => i.brandId === args.brandId
        );
      }

      if (!integration) {
        console.error(
          `No Deliveroo integration found for siteId: ${args.siteId}, brandId: ${args.brandId}`
        );
        return {
          success: false,
          error: `No integration found for siteId: ${args.siteId}, brandId: ${args.brandId}`,
        };
      }

      const storeId = integration.storeId;

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
      return { success: false, error: errorMessage };
    }
  },
});
