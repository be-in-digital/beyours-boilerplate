"use client"

interface PrintTicketItem {
  productName: string
  quantity: number
  options: string[]
  notes?: string
}

interface PrintTicketLayoutProps {
  storeName: string
  orderNumber: string
  orderType: "delivery" | "pickup" | "dine_in"
  source: "website" | "uber_eats" | "deliveroo" | "pos"
  items: PrintTicketItem[]
  customerName?: string
  customerPhone?: string
  deliveryNotes?: string
  allergens?: string[]
  estimatedPrepTime?: number
  trackingToken?: string
  printTrigger?: "confirmed" | "ready" | "reprint"
  paperSize: "80mm" | "58mm"
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  delivery: "LIVRAISON",
  pickup: "A EMPORTER",
  dine_in: "SUR PLACE",
}

const SOURCE_LABELS: Record<string, string> = {
  website: "Site Web",
  uber_eats: "Uber Eats",
  deliveroo: "Deliveroo",
  pos: "Caisse",
}

const TRIGGER_LABELS: Record<string, string> = {
  confirmed: "NOUVEAU",
  ready: "PRÊT",
  reprint: "RÉIMPRESSION",
}

export function PrintTicketLayout({
  storeName,
  orderNumber,
  orderType,
  source,
  items,
  customerName,
  customerPhone,
  deliveryNotes,
  allergens,
  estimatedPrepTime,
  trackingToken,
  printTrigger,
  paperSize,
}: PrintTicketLayoutProps) {
  const is58mm = paperSize === "58mm"

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: is58mm ? "11px" : "13px",
        width: is58mm ? "48mm" : "72mm",
        padding: "4mm",
        lineHeight: 1.4,
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3mm" }}>
        <div style={{ fontWeight: "bold", fontSize: is58mm ? "14px" : "16px" }}>
          {storeName}
        </div>
        {printTrigger && (
          <div
            style={{
              fontWeight: "bold",
              fontSize: is58mm ? "16px" : "20px",
              margin: "2mm 0",
              padding: "1mm",
              border: "2px solid #000",
              display: "inline-block",
            }}
          >
            {TRIGGER_LABELS[printTrigger] ?? ""}
          </div>
        )}
      </div>

      {/* Order info */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginBottom: "2mm" }}>
        <div style={{ fontWeight: "bold", fontSize: is58mm ? "16px" : "20px", textAlign: "center" }}>
          #{orderNumber}
        </div>
        <div style={{ textAlign: "center", marginTop: "1mm" }}>
          {ORDER_TYPE_LABELS[orderType]} | {SOURCE_LABELS[source]}
        </div>
      </div>

      {/* Customer info */}
      {(customerName || customerPhone) && (
        <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginBottom: "2mm" }}>
          {customerName && <div>Client: {customerName}</div>}
          {customerPhone && <div>Tel: {customerPhone}</div>}
        </div>
      )}

      {/* Items */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginBottom: "2mm" }}>
        {items.map((item, i) => (
          <div key={i} style={{ marginBottom: "2mm" }}>
            <div style={{ fontWeight: "bold" }}>
              {item.quantity}x {item.productName}
            </div>
            {item.options.length > 0 && (
              <div style={{ paddingLeft: "3mm", fontSize: is58mm ? "10px" : "11px" }}>
                {item.options.join(", ")}
              </div>
            )}
            {item.notes && (
              <div style={{ paddingLeft: "3mm", fontStyle: "italic", fontSize: is58mm ? "10px" : "11px" }}>
                Note: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delivery notes */}
      {deliveryNotes && (
        <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginBottom: "2mm" }}>
          <div style={{ fontWeight: "bold" }}>Instructions livraison:</div>
          <div>{deliveryNotes}</div>
        </div>
      )}

      {/* Allergens */}
      {allergens && allergens.length > 0 && (
        <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginBottom: "2mm" }}>
          <div style={{ fontWeight: "bold" }}>ALLERGÈNES :</div>
          <div>{allergens.join(", ")}</div>
        </div>
      )}

      {/* Estimated time */}
      {estimatedPrepTime && (
        <div style={{ textAlign: "center", marginTop: "2mm", fontWeight: "bold" }}>
          Temps estime: {estimatedPrepTime} min
        </div>
      )}

      {/* Tracking QR placeholder (80mm only) */}
      {!is58mm && trackingToken && (
        <div style={{ textAlign: "center", marginTop: "3mm", fontSize: "10px" }}>
          Suivi: {trackingToken}
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px dashed #000", paddingTop: "2mm", marginTop: "3mm", textAlign: "center", fontSize: "10px" }}>
        {new Date().toLocaleString("fr-FR")}
      </div>
    </div>
  )
}
