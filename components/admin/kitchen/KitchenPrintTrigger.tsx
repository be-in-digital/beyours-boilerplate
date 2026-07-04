"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { createRoot } from "react-dom/client"
import { PrintTicketLayout } from "./PrintTicketLayout"

interface PrintConfig {
  provider: "browser" | "star_cloud" | "epson_cloud" | "sunmi_cloud"
  printerId?: string
  apiKey?: string
  triggers: ("confirmed" | "ready" | "reprint")[]
  paperSize: "80mm" | "58mm"
  enabled: boolean
}

interface KitchenPrintTriggerProps {
  storeId: Id<"stores">
  printConfig: PrintConfig
  storeName: string
  onToast: (msg: string, type: "success" | "error" | "info") => void
}

const PRINT_TIMEOUT_MS = 20_000

export function KitchenPrintTrigger({
  storeId,
  printConfig,
  storeName,
  onToast,
}: KitchenPrintTriggerProps) {
  const printQueue = useQuery(api.kitchenTickets.getPrintQueue, { storeId })
  const markPrintSent = useMutation(api.kitchenTickets.markPrintSent)
  const markPrintFailed = useMutation(api.kitchenTickets.markPrintFailed)

  const isPrintingRef = useRef(false)
  const currentTicketIdRef = useRef<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const processNextTicket = useCallback(async () => {
    if (isPrintingRef.current) return
    if (!printQueue || printQueue.length === 0) return
    if (printConfig.provider !== "browser") return

    const ticket = printQueue[0]
    if (!ticket) return

    isPrintingRef.current = true
    currentTicketIdRef.current = ticket._id

    try {
      // Create iframe if not exists
      if (!iframeRef.current) {
        const iframe = document.createElement("iframe")
        iframe.style.position = "fixed"
        iframe.style.width = "0"
        iframe.style.height = "0"
        iframe.style.border = "none"
        iframe.style.overflow = "hidden"
        iframe.style.left = "-9999px"
        document.body.appendChild(iframe)
        iframeRef.current = iframe
      }

      const iframe = iframeRef.current
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
      if (!iframeDoc) throw new Error("Cannot access iframe document")

      // Write print layout into iframe
      iframeDoc.open()
      iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <style>
    @page { margin: 0; }
    body { margin: 0; padding: 0; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body><div id="print-root"></div></body>
</html>`)
      iframeDoc.close()

      const rootEl = iframeDoc.getElementById("print-root")
      if (!rootEl) throw new Error("print-root not found")

      // Render the layout
      const root = createRoot(rootEl)
      root.render(
        <PrintTicketLayout
          storeName={storeName}
          orderNumber={ticket.orderNumber}
          orderType={ticket.orderType}
          source={ticket.source}
          items={ticket.items}
          customerName={ticket.customerName}
          customerPhone={ticket.customerPhone}
          deliveryNotes={ticket.deliveryNotes}
          allergens={ticket.allergens}
          estimatedPrepTime={ticket.estimatedPrepTime}
          trackingToken={ticket.trackingToken}
          printTrigger={ticket.printTrigger}
          paperSize={printConfig.paperSize}
        />
      )

      // Wait for render
      await new Promise((r) => setTimeout(r, 100))

      // Setup onafterprint / timeout
      const iframeWin = iframe.contentWindow
      if (!iframeWin) throw new Error("Cannot access iframe window")

      const done = (success: boolean) => {
        clearTimeout(timeoutId)
        iframeWin.onafterprint = null
        root.unmount()

        if (success) {
          markPrintSent({ id: ticket._id as Id<"kitchenTickets"> })
        } else {
          markPrintFailed({
            id: ticket._id as Id<"kitchenTickets">,
            reason: "Print dialog timeout (20s)",
          })
          onToast(`Impression echouee pour #${ticket.orderNumber}`, "error")
        }

        isPrintingRef.current = false
        currentTicketIdRef.current = null
      }

      iframeWin.onafterprint = () => done(true)
      const timeoutId = setTimeout(() => done(false), PRINT_TIMEOUT_MS)

      // Trigger print
      iframeWin.print()
    } catch (err) {
      console.error("Print error:", err)
      await markPrintFailed({
        id: ticket._id as Id<"kitchenTickets">,
        reason: String(err),
      })
      onToast(`Erreur impression #${ticket.orderNumber}`, "error")
      isPrintingRef.current = false
      currentTicketIdRef.current = null
    }
  }, [printQueue, printConfig, storeName, markPrintSent, markPrintFailed, onToast])

  // Process queue when it changes
  useEffect(() => {
    if (!isPrintingRef.current && printQueue && printQueue.length > 0) {
      processNextTicket()
    }
  }, [printQueue, processNextTicket])

  // Cleanup iframe on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        document.body.removeChild(iframeRef.current)
        iframeRef.current = null
      }
    }
  }, [])

  return null
}
