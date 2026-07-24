"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { motion } from "framer-motion"
import QRCode from "qrcode"
import {
  BadgeCheckIcon,
  Clock3Icon,
  Loader2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"
import { api } from "@/convex/_generated/api"
import { formatCountdown } from "@/lib/game"

/**
 * Live prize ticket — the page behind the QR code on the reward screen and
 * in the win email. Customers keep it; staff scanning it (while logged in)
 * get a "Valider" button to mark the prize as used.
 */

interface TicketData {
  code: string
  status: "pending" | "claimed" | "redeemed" | "expired" | "cancelled"
  playerFirstName?: string
  expiresAt: number
  redeemedAt?: number
  store: { name: string } | null
  prize: {
    name: string
    description?: string
    type: string
    validityDays: number
  } | null
}

export default function PrizeTicketContent() {
  const params = useParams<{ code: string }>()
  const code = params.code?.toUpperCase() ?? ""

  const ticket = useQuery(api.gamePlay.getRedemptionByCode, code ? { code } : "skip") as
    | TicketData
    | null
    | undefined
  const canRedeem = useQuery(api.prizeRedemptions.canRedeem, code ? { code } : "skip") as
    | boolean
    | undefined
  const redeemMutation = useMutation(api.prizeRedemptions.redeemByCode)

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [justRedeemed, setJustRedeemed] = useState(false)

  useEffect(() => {
    if (!code) return
    QRCode.toDataURL(`${window.location.origin}/game/prize/${code}`, {
      width: 480,
      margin: 1,
      color: { dark: "#1c1427", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [code])

  useEffect(() => {
    if (!ticket) return
    const tick = () => setRemaining(ticket.expiresAt - Date.now())
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [ticket])

  const handleRedeem = async () => {
    if (redeeming) return
    setRedeeming(true)
    setRedeemError(null)
    try {
      await redeemMutation({ code })
      setJustRedeemed(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      if (message.includes("ALREADY_REDEEMED")) setRedeemError("Ce lot a déjà été utilisé.")
      else if (message.includes("REDEMPTION_EXPIRED")) setRedeemError("Ce lot a expiré.")
      else setRedeemError("Validation impossible. Réessayez.")
    } finally {
      setRedeeming(false)
    }
  }

  const isActive = ticket?.status === "pending" || ticket?.status === "claimed"
  const lessThanADay = remaining !== null && remaining < 24 * 60 * 60 * 1000 && remaining > 0

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#120d1a] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-20%] h-[55vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,115,22,0.14),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-5 py-10">
        {ticket === undefined && (
          <div className="flex flex-col items-center text-white/50">
            <Loader2Icon className="h-6 w-6 animate-spin" />
            <p className="mt-3 text-sm">Chargement du ticket…</p>
          </div>
        )}

        {ticket === null && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-4xl">
              🔍
            </div>
            <h1 className="font-heading text-2xl font-bold">Ticket introuvable</h1>
            <p className="mt-2 text-sm text-white/50">
              Ce code ne correspond à aucun lot. Vérifiez le lien de votre email.
            </p>
          </div>
        )}

        {ticket && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 20 }}
            className="w-full max-w-sm"
          >
            <div className="relative rounded-3xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[3px] shadow-[0_22px_60px_rgba(245,165,36,0.3)]">
              <div className="relative overflow-hidden rounded-[calc(1.5rem-3px)] bg-[#fdfaf3] text-[#1c1427]">
                {/* Status stamp overlay */}
                {(ticket.status === "redeemed" || justRedeemed) && (
                  <StatusStamp label="UTILISÉ" tone="emerald" />
                )}
                {ticket.status === "expired" && !justRedeemed && (
                  <StatusStamp label="EXPIRÉ" tone="slate" />
                )}
                {ticket.status === "cancelled" && <StatusStamp label="ANNULÉ" tone="red" />}

                <div className="px-6 pb-5 pt-6 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-600">
                    Ticket gagnant
                  </p>
                  <p className="mt-3 font-heading text-xl font-bold leading-tight">
                    {ticket.prize?.name ?? "Lot"}
                  </p>
                  {ticket.prize?.description && (
                    <p className="mt-1 text-xs text-[#1c1427]/55">{ticket.prize.description}</p>
                  )}
                  {ticket.store && (
                    <p className="mt-1.5 text-xs text-[#1c1427]/50">chez {ticket.store.name}</p>
                  )}
                  {ticket.playerFirstName && (
                    <p className="mt-2 inline-block rounded-full bg-[#1c1427]/[0.06] px-3 py-1 text-[11px] font-medium text-[#1c1427]/60">
                      Pour {ticket.playerFirstName}
                    </p>
                  )}
                </div>

                <div className="relative flex items-center" aria-hidden>
                  <span className="absolute -left-3 h-6 w-6 rounded-full bg-[#120d1a]" />
                  <span className="mx-5 h-px flex-1 border-t-2 border-dashed border-[#1c1427]/15" />
                  <span className="absolute -right-3 h-6 w-6 rounded-full bg-[#120d1a]" />
                </div>

                <div className="px-6 pb-6 pt-5 text-center">
                  <div
                    className={`mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border border-[#1c1427]/10 bg-white p-2.5 shadow-inner ${
                      !isActive || justRedeemed ? "opacity-30 grayscale" : ""
                    }`}
                  >
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt={`QR code du lot ${code}`} className="h-full w-full" />
                    ) : (
                      <span className="text-xs text-[#1c1427]/40">QR indisponible</span>
                    )}
                  </div>
                  <p className="mt-4 font-mono text-2xl font-bold tracking-[0.35em]">{ticket.code}</p>
                  {isActive && !justRedeemed && (
                    <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-[#1c1427]/50">
                      <Clock3Icon className="h-3 w-3" />
                      Valable jusqu&apos;au{" "}
                      {new Date(ticket.expiresAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      })}
                      {lessThanADay && remaining !== null && (
                        <span className="ml-1 font-mono font-semibold text-amber-700">
                          ({formatCountdown(remaining)})
                        </span>
                      )}
                    </p>
                  )}
                  {(ticket.status === "redeemed" || justRedeemed) && (
                    <p className="mt-2 text-[11px] font-medium text-emerald-700">
                      Utilisé{" "}
                      {ticket.redeemedAt
                        ? `le ${new Date(ticket.redeemedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "à l'instant"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Staff validation */}
            {canRedeem && isActive && !justRedeemed && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.07] p-4"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <ShieldCheckIcon className="h-4 w-4" /> Espace équipe
                </p>
                <button
                  type="button"
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 py-3.5 font-heading text-sm font-bold uppercase tracking-widest text-white shadow-[0_8px_25px_rgba(16,185,129,0.35)] disabled:opacity-60"
                >
                  {redeeming ? (
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheckIcon className="h-4 w-4" />
                  )}
                  Valider ce lot
                </button>
                {redeemError && (
                  <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-red-300">
                    <XCircleIcon className="h-3.5 w-3.5" /> {redeemError}
                  </p>
                )}
              </motion.div>
            )}

            {justRedeemed && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm font-semibold text-emerald-200"
              >
                <BadgeCheckIcon className="h-4 w-4" /> Lot validé — bonne dégustation !
              </motion.p>
            )}

            <p className="mt-5 text-center text-[11px] text-white/35">
              Une seule utilisation, sur place, sur présentation de ce ticket.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  )
}

function StatusStamp({ label, tone }: { label: string; tone: "emerald" | "slate" | "red" }) {
  const colors = {
    emerald: "border-emerald-600 text-emerald-600",
    slate: "border-slate-500 text-slate-500",
    red: "border-red-500 text-red-500",
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.6, rotate: -18 }}
      animate={{ opacity: 1, scale: 1, rotate: -12 }}
      transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.25 }}
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      aria-hidden
    >
      <span
        className={`rounded-lg border-4 px-6 py-2 font-heading text-3xl font-black uppercase tracking-[0.2em] opacity-80 ${colors[tone]}`}
        style={{ boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.4)" }}
      >
        {label}
      </span>
    </motion.div>
  )
}
