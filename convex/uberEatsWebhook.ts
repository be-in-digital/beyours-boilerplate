import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

type StoreIntegrationRecord = {
  _id: Id<"storeIntegrations">
  storeId: Id<"stores">
  platform: "uberEats" | "deliveroo"
  platformStoreId: string
  enabled: boolean
  autoAccept: boolean
  orderMode?: "auto_accept" | "auto_reject" | "manual"
}

/**
 * Uber Eats webhook handler
 * Receives thin webhooks (metadata only), fetches full order, maps, and saves.
 * Credentials are read from environment variables (platform-level, not per-client).
 *
 * NOTE: When the Uber app is in sandbox mode but receives real production webhooks,
 * fetchOrder will fail (404/401) because sandbox API doesn't have production orders.
 * In that case we create the order/ticket with partial data from the webhook event.
 */
export const handleWebhook = httpAction(async (ctx, request) => {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-uber-signature") ?? ""

    // Read credentials from environment variables (BeInDigital platform credentials)
    const { getPackageEnv, getSiteEnv } = await import("@be-in-digital/core/env")
    const pkg = getPackageEnv()
    const site = getSiteEnv()
    const clientId = pkg.UBER_EATS_CLIENT_ID
    const clientSecret = pkg.UBER_EATS_CLIENT_SECRET
    const webhookSecret = pkg.UBER_EATS_WEBHOOK_SECRET
    const sandboxMode = site.UBER_EATS_SANDBOX_MODE === "true"

    if (!clientId || !clientSecret) {
      return new Response("Uber Eats credentials not configured in environment", { status: 503 })
    }

    // Verify webhook signature using dedicated webhook secret (falls back to client secret)
    const { uberEats } = await import("@be-in-digital/integrations")
    const signingSecret = webhookSecret || clientSecret
    const isValid = await uberEats.verifyUberEatsSignature(rawBody, signature, signingSecret)

    if (!isValid) {
      console.error("Invalid Uber Eats webhook signature")
      return new Response("Invalid signature", { status: 401 })
    }

    // Parse webhook event. Payload shape varies by API version (v0.1 vs v1) and
    // event type — `meta` is not always present. Derive ids defensively and
    // never throw on shape: a webhook must be acknowledged with 200.
    let event: {
      event_type?: string
      event_id?: string
      meta?: { resource_id?: string; resource_href?: string; status?: string }
      resource_href?: string
      resource_id?: string
      order_id?: string
      id?: string
      [key: string]: unknown
    }
    try {
      event = JSON.parse(rawBody)
    } catch {
      console.error("Uber Eats webhook: unparseable body, acking 200:", rawBody.slice(0, 300))
      return new Response("OK", { status: 200 })
    }

    // Normalized accessors (meta may be absent in some payload shapes).
    const resourceId =
      event.meta?.resource_id ?? event.resource_id ?? event.order_id ?? event.id ?? ""
    const metaStatus = event.meta?.status ?? (event.status as string | undefined) ?? ""

    // Log the raw body when we cannot find an id, to capture the real shape.
    if (!resourceId) {
      console.warn(`Uber Eats webhook: no resource id in ${event.event_type ?? "?"}; body=${rawBody.slice(0, 500)}`)
    }
    console.log(`Uber Eats webhook: ${event.event_type} - ${resourceId}`)

    // Handle order events
    if (event.event_type === "orders.notification" || event.event_type === "eats.order.status_update") {
      const uberCredentials = {
        clientId,
        clientSecret,
        sandboxMode,
      }

      // Try to fetch full order from Uber Eats API
      // May fail if sandbox credentials are used for production orders
      let fullOrder = null
      let unifiedOrder = null
      try {
        fullOrder = await uberEats.fetchOrder(uberCredentials, resourceId)
        unifiedOrder = uberEats.mapUberEatsOrderToUnified(fullOrder)
        console.log(`Fetched order ${unifiedOrder.displayId} for store ${unifiedOrder.storeExternalId}`)
      } catch (fetchError) {
        console.warn(`Could not fetch full order ${resourceId}:`, fetchError)
      }

      // Find matching store integration
      const allIntegrations = await ctx.runQuery(
        internal.storeIntegrations.internalListByPlatformEnabled,
        { platform: "uberEats" }
      ) as StoreIntegrationRecord[]

      // Match by platformStoreId if we have full order, otherwise use first enabled integration
      const integration = unifiedOrder
        ? allIntegrations.find((i) => i.platformStoreId === unifiedOrder.storeExternalId)
        : allIntegrations[0]

      if (!integration) {
        console.error(`No Uber Eats integration found`)
        return new Response("OK", { status: 200 })
      }

      // Handle new order creation
      if (event.event_type === "orders.notification") {
        const externalOrderId = unifiedOrder?.externalOrderId ?? resourceId
        const orderNumber = unifiedOrder?.displayId ?? `UE-${resourceId.slice(-6).toUpperCase()}`

        // Create order via internal mutation (idempotent: created=false on retry).
        // Explicit annotation avoids circular type inference through `internal`.
        const { orderId: internalOrderId, created }: { orderId: Id<"orders">; created: boolean } = await ctx.runMutation(internal.orders.createFromWebhook, {
          storeId: integration.storeId,
          externalOrderId,
          platform: "uberEats",
          status: "pending",
          type: unifiedOrder?.type ?? "delivery",
          customerName: unifiedOrder?.customer.name ?? "Client Uber Eats",
          customerPhone: unifiedOrder?.customer.phone,
          customerEmail: unifiedOrder?.customer.email,
          deliveryAddress: unifiedOrder?.delivery?.address ? {
            street: unifiedOrder.delivery.address.street,
            city: unifiedOrder.delivery.address.city ?? "",
            postalCode: unifiedOrder.delivery.address.postalCode ?? "",
            country: unifiedOrder.delivery.address.country ?? "",
          } : undefined,
          items: unifiedOrder?.items.map(item => ({
            externalId: item.externalId,
            name: item.name,
            quantity: item.quantity,
            price: item.totalPrice,
            modifiers: item.modifiers.map(mod => ({
              externalId: mod.externalId,
              name: mod.name,
              price: mod.price,
            })),
          })) ?? [{
            externalId: "unknown",
            name: "Commande Uber Eats",
            quantity: 1,
            price: 0,
          }],
          subtotal: unifiedOrder?.subtotal ?? 0,
          total: unifiedOrder?.total ?? 0,
          notes: unifiedOrder?.notes,
          createdAt: unifiedOrder ? new Date(unifiedOrder.placedAt).getTime() : Date.now(),
        })

        console.log(`Created internal order ${internalOrderId} from Uber Eats order ${externalOrderId}`)

        // On a duplicate webhook (Uber retries), the order already exists — do
        // NOT create a second kitchen ticket or re-run auto-accept/reject.
        if (!created) {
          console.log(`Duplicate Uber Eats webhook for ${externalOrderId} — already processed, skipping ticket + auto-accept`)
          return new Response("OK", { status: 200 })
        }

        // Create kitchen ticket for KDS
        try {
          const trackingToken = `ue-${externalOrderId.slice(-8)}-${Date.now().toString(36)}`

          await ctx.runMutation(internal.kitchenTickets.internalCreate, {
            storeId: integration.storeId,
            orderId: internalOrderId as Id<"orders">,
            orderNumber,
            orderType: unifiedOrder?.type ?? "delivery",
            items: unifiedOrder?.items.map(item => ({
              productName: item.name,
              quantity: item.quantity,
              options: item.modifiers.map(mod => mod.name),
              notes: undefined,
            })) ?? [{
              productName: "Commande Uber Eats",
              quantity: 1,
              options: [],
            }],
            priority: "normal" as const,
            source: "uber_eats" as const,
            trackingToken,
            customerName: unifiedOrder?.customer.name ?? "Client Uber Eats",
            customerPhone: unifiedOrder?.customer.phone,
            deliveryNotes: unifiedOrder?.notes,
          })
          console.log(`Created kitchen ticket for Uber Eats order ${orderNumber}`)
        } catch (error) {
          console.error(`Failed to create kitchen ticket:`, error)
        }

        // Resolve order mode: platform override > store global > legacy autoAccept > manual
        const store = await ctx.runQuery(internal.stores.internalGetById, { id: integration.storeId })
        const orderMode = integration.orderMode
          ?? store?.orderMode
          ?? (integration.autoAccept ? "auto_accept" : "manual")

        if (orderMode === "auto_accept") {
          try {
            if (unifiedOrder) {
              await uberEats.acceptOrder(uberCredentials, externalOrderId)
            }
            await ctx.runMutation(internal.orders.internalUpdateStatus, {
              id: internalOrderId as Id<"orders">,
              status: "confirmed",
            })
            console.log(`[Auto-Accept] Uber Eats order ${externalOrderId}`)
          } catch (error) {
            console.error(`Failed to auto-accept Uber Eats order:`, error)
          }
        } else if (orderMode === "auto_reject") {
          try {
            if (unifiedOrder) {
              await uberEats.cancelOrder(uberCredentials, externalOrderId, { code: "STORE_CLOSED", explanation: "Store is not accepting orders" })
            }
            await ctx.runMutation(internal.orders.internalUpdateStatus, {
              id: internalOrderId as Id<"orders">,
              status: "cancelled",
            })
            console.log(`[Auto-Reject] Uber Eats order ${externalOrderId}`)
          } catch (error) {
            console.error(`Failed to auto-reject Uber Eats order:`, error)
          }
        } else {
          console.log(`[Manual] Uber Eats order ${externalOrderId} - awaiting staff action`)
        }
      }

      // Handle order status updates
      if (event.event_type === "eats.order.status_update") {
        console.log(`Order status update: ${resourceId} -> ${metaStatus}`)

        const statusMap: Record<string, string> = {
          CREATED: "pending",
          ACCEPTED: "confirmed",
          IN_PROGRESS: "preparing",
          READY_FOR_PICKUP: "ready",
          PICKED_UP: "out_for_delivery",
          DELIVERED: "delivered",
          CANCELLED: "cancelled",
          FINISHED: "completed",
        }

        const mappedStatus = unifiedOrder?.status ?? statusMap[metaStatus] ?? "pending"

        try {
          await ctx.runMutation(internal.orders.updateFromWebhook, {
            externalOrderId: unifiedOrder?.externalOrderId ?? resourceId,
            platform: "uberEats" as const,
            status: mappedStatus as "pending" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled",
            updatedAt: Date.now(),
          })
          console.log(`Updated order status to ${mappedStatus}`)
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          if (msg.toLowerCase().includes("not found")) {
            // Order may not exist locally yet (status_update arrived before orders.notification).
            // Ack so Uber stops retrying; the subsequent create webhook will set the right status.
            console.warn(`Order ${resourceId} not found locally, ack status_update`)
          } else {
            // Genuine failure — let Uber retry by returning 500 via the outer catch.
            throw error
          }
        }
      }

      return new Response("OK", { status: 200 })
    }

    // Handle store status events
    if (event.event_type === "eats.store.status_update") {
      console.log(`Store status update: ${resourceId} -> ${metaStatus}`)
      return new Response("OK", { status: 200 })
    }

    // Handle order cancellation / failure.
    // The current uAPI emits "orders.failure" when an order is cancelled/denied;
    // older integrations used "orders.cancel". Handle both → mark cancelled, ack 200.
    if (event.event_type === "orders.cancel" || event.event_type === "orders.failure") {
      console.log(`Order cancelled/failed (${event.event_type}): ${resourceId}`)

      try {
        await ctx.runMutation(internal.orders.updateFromWebhook, {
          externalOrderId: resourceId,
          platform: "uberEats" as const,
          status: "cancelled" as const,
          updatedAt: Date.now(),
        })
        console.log(`Cancelled order ${resourceId}`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        if (msg.toLowerCase().includes("not found")) {
          // Cancel for an order we never stored — ack and move on.
          console.warn(`Cancel for unknown order ${resourceId}, ack`)
        } else {
          // Genuine failure — let Uber retry.
          throw error
        }
      }

      return new Response("OK", { status: 200 })
    }

    // Handle scheduled order notifications (Uber sends these ahead of fulfillment time).
    // We persist the order so staff can see it but deliberately do NOT auto-accept/reject;
    // confirmation should happen closer to the scheduled time.
    if (event.event_type === "orders.scheduled") {
      console.log(`Scheduled order notification: ${resourceId}`)

      const uberCredentials = {
        clientId,
        clientSecret,
        sandboxMode,
      }

      let fullOrder: Awaited<ReturnType<typeof uberEats.fetchOrder>> | null = null
      let unifiedOrder: ReturnType<typeof uberEats.mapUberEatsOrderToUnified> | null = null
      try {
        fullOrder = await uberEats.fetchOrder(uberCredentials, resourceId)
        unifiedOrder = uberEats.mapUberEatsOrderToUnified(fullOrder)
        console.log(`Fetched scheduled order ${unifiedOrder.displayId} (scheduled_time=${fullOrder.scheduled_time ?? "n/a"})`)
      } catch (fetchError) {
        console.warn(`Could not fetch scheduled order ${resourceId}:`, fetchError)
      }

      const allIntegrations = await ctx.runQuery(
        internal.storeIntegrations.internalListByPlatformEnabled,
        { platform: "uberEats" }
      ) as StoreIntegrationRecord[]

      const integration = unifiedOrder
        ? allIntegrations.find((i) => i.platformStoreId === unifiedOrder?.storeExternalId)
        : allIntegrations[0]

      if (!integration) {
        console.error(`No Uber Eats integration found for scheduled order ${resourceId}`)
        return new Response("OK", { status: 200 })
      }

      const externalOrderId = unifiedOrder?.externalOrderId ?? resourceId
      const scheduledTime = fullOrder?.scheduled_time ?? "unknown"
      const scheduledNotes = `[SCHEDULED for ${scheduledTime}]${unifiedOrder?.notes ? " " + unifiedOrder.notes : ""}`

      await ctx.runMutation(internal.orders.createFromWebhook, {
        storeId: integration.storeId,
        externalOrderId,
        platform: "uberEats",
        status: "pending",
        type: unifiedOrder?.type ?? "delivery",
        customerName: unifiedOrder?.customer.name ?? "Client Uber Eats (scheduled)",
        customerPhone: unifiedOrder?.customer.phone,
        customerEmail: unifiedOrder?.customer.email,
        deliveryAddress: unifiedOrder?.delivery?.address ? {
          street: unifiedOrder.delivery.address.street,
          city: unifiedOrder.delivery.address.city ?? "",
          postalCode: unifiedOrder.delivery.address.postalCode ?? "",
          country: unifiedOrder.delivery.address.country ?? "",
        } : undefined,
        items: unifiedOrder?.items.map(item => ({
          externalId: item.externalId,
          name: item.name,
          quantity: item.quantity,
          price: item.totalPrice,
          modifiers: item.modifiers.map(mod => ({
            externalId: mod.externalId,
            name: mod.name,
            price: mod.price,
          })),
        })) ?? [{
          externalId: "unknown",
          name: "Commande Uber Eats (scheduled)",
          quantity: 1,
          price: 0,
        }],
        subtotal: unifiedOrder?.subtotal ?? 0,
        total: unifiedOrder?.total ?? 0,
        notes: scheduledNotes,
        createdAt: unifiedOrder ? new Date(unifiedOrder.placedAt).getTime() : Date.now(),
      })

      console.log(`Persisted scheduled Uber Eats order ${externalOrderId} for ${scheduledTime} — awaiting manual confirmation`)

      return new Response("OK", { status: 200 })
    }

    // Unknown event type - still acknowledge
    return new Response("OK", { status: 200 })
  } catch (error) {
    console.error("Uber Eats webhook error:", error)
    return new Response("Internal error", { status: 500 })
  }
})
