"use client"

import { useEffect, useRef, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
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

/**
 * How long to wait on the print dialog before giving up on a slip.
 *
 * Must stay below the backend's `PRINT_CLAIM_TTL_MS` (45s): the claim has to
 * outlive the dialog, or a second tablet takes the ticket while this one still
 * has it open and the duplicate print comes straight back.
 */
const PRINT_TIMEOUT_MS = 20_000

export function KitchenPrintTrigger({
  storeId,
  printConfig,
  storeName,
  onToast,
}: KitchenPrintTriggerProps) {
  const printQueue = useQuery(api.kitchenTickets.getPrintQueue, { storeId })
  const claimForPrint = useMutation(api.kitchenTickets.claimForPrint)
  const markPrintSent = useMutation(api.kitchenTickets.markPrintSent)
  const markPrintFailed = useMutation(api.kitchenTickets.markPrintFailed)

  const isPrintingRef = useRef(false)
  const currentTicketIdRef = useRef<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const processNextTicket = useCallback(async () => {
    if (isPrintingRef.current) return
    if (!printQueue || printQueue.length === 0) return
    if (printConfig.provider !== "browser") return

    // Taken before the first await, and released on every exit path below: the
    // queue subscription fires again while we are claiming, and re-entering
    // here would race this tablet against itself.
    isPrintingRef.current = true

    let winner: NonNullable<typeof printQueue>[number] | null = null
    // The claim's identity, carried back when this tablet reports the outcome.
    let claimId: string | null = null

    try {
      // The queue is a list of candidates, not permission to print. Two
      // tablets watching the same pass see the same rows, and the old code
      // printed `printQueue[0]` on both, only claiming the ticket from
      // `onafterprint` one to twenty seconds later — every service with two
      // screens in the kitchen printed twice. `claimForPrint` is a Convex
      // mutation, so its read and write are one transaction and exactly one
      // caller wins. Losing means another tablet already holds that slip:
      // walk to the next candidate instead of printing it again.
      for (const candidate of printQueue) {
        const won = await claimForPrint({
          id: candidate._id as Id<"kitchenTickets">,
        })
        if (won) {
          winner = candidate
          claimId = won
          break
        }
      }
    } catch (err) {
      // The claim never landed, so nothing was taken and nothing is owed. Leave
      // the ticket for the next queue update rather than recording a failure
      // against a slip this tablet does not hold.
      console.error("Print claim error:", err)
      isPrintingRef.current = false
      return
    }

    if (!winner) {
      // Every candidate belongs to another tablet. Nothing to print this pass.
      isPrintingRef.current = false
      return
    }

    const ticket = winner
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

      // Render the layout.
      //
      // React 19 commits asynchronously, and the old code slept 100ms and hoped.
      // On a tablet that is busy — the KDS re-rendering a full board of tickets —
      // the commit lands after the sleep and `print()` captures an empty page.
      // `flushSync` forces the commit inside this call, so what follows can check
      // a fact instead of tuning a delay. A double `requestAnimationFrame` was the
      // alternative, but it only proves two frames elapsed, not that this tree is
      // in the document: the same bet with a longer fuse.
      const root = createRoot(rootEl)
      flushSync(() => {
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
      })

      // A blank slip filed as "printed" is worse than one that fails: the ticket
      // leaves the queue, the alarm never counts it, and nobody in the kitchen
      // ever learns the order existed. So prove the commit produced this ticket
      // before spending paper — `#<orderNumber>` is the one string the layout
      // always renders — and fail loudly when it did not.
      if (!rootEl.textContent?.includes(ticket.orderNumber)) {
        root.unmount()
        await markPrintFailed({
          id: ticket._id as Id<"kitchenTickets">,
          reason: "Rendered ticket was blank — nothing sent to the printer",
          claimId: claimId ?? undefined,
        })
        onToast(`Ticket vide, impression annulée #${ticket.orderNumber}`, "error")
        isPrintingRef.current = false
        currentTicketIdRef.current = null
        return
      }

      // Setup onafterprint / timeout
      const iframeWin = iframe.contentWindow
      if (!iframeWin) throw new Error("Cannot access iframe window")

      const done = (success: boolean) => {
        clearTimeout(timeoutId)
        iframeWin.onafterprint = null
        root.unmount()

        // The claim id goes back with the outcome. Without it, a tablet whose
        // dialog outlived its 45s claim would close a slip a second tablet had
        // since taken and is printing right now — the duplicate the claim was
        // added to stop, arriving late instead of early. The server refuses a
        // stale id. A rejection is logged rather than swallowed: leaving it
        // unhandled would strand the ticket in `printing` until the TTL.
        if (success) {
          markPrintSent({
            id: ticket._id as Id<"kitchenTickets">,
            claimId: claimId ?? undefined,
          }).catch((err) => console.error("markPrintSent failed:", err))
        } else {
          markPrintFailed({
            id: ticket._id as Id<"kitchenTickets">,
            reason: "Print dialog timeout (20s)",
            claimId: claimId ?? undefined,
          }).catch((err) => console.error("markPrintFailed failed:", err))
          onToast(`Impression échouée pour #${ticket.orderNumber}`, "error")
        }

        isPrintingRef.current = false
        currentTicketIdRef.current = null
      }

      // Known limitation, stated plainly: no browser tells us whether the cook
      // printed or hit Cancel. `onafterprint` fires identically for both, and
      // there is no event, promise or return value that separates them — so a
      // cancelled dialog is still recorded as printed here. Do not add a guard
      // that pretends otherwise; there is nothing to read. What is knowable is
      // handled — the claim above stops the duplicate, the check above stops the
      // blank slip — and the operator's recourse for a cancelled dialog is the
      // reprint button on the ticket card.
      iframeWin.onafterprint = () => done(true)
      const timeoutId = setTimeout(() => done(false), PRINT_TIMEOUT_MS)

      // Trigger print
      iframeWin.print()
    } catch (err) {
      console.error("Print error:", err)
      await markPrintFailed({
        id: ticket._id as Id<"kitchenTickets">,
        reason: String(err),
        claimId: claimId ?? undefined,
      })
      onToast(`Erreur impression #${ticket.orderNumber}`, "error")
      isPrintingRef.current = false
      currentTicketIdRef.current = null
    }
  }, [printQueue, printConfig, storeName, claimForPrint, markPrintSent, markPrintFailed, onToast])

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
