"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import QRCode from "qrcode"
import { MailCheckIcon, UtensilsIcon } from "lucide-react"
import { formatCountdown, type GamePrize } from "@/lib/game"
import { prizeEmoji } from "./WelcomeScreen"

const MotionLink = motion.create(Link)

/**
 * The reward: a boarding-pass ticket with the redemption QR code.
 * The QR encodes the live ticket URL — staff scans it, customer keeps it.
 */

interface RewardTicketProps {
  code: string
  expiresAt: number
  prize: GamePrize | null
  storeName?: string
  email: string
}

export function RewardTicket({ code, expiresAt, prize, storeName, email }: RewardTicketProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [remaining, setRemaining] = useState(() => expiresAt - Date.now())

  useEffect(() => {
    const url = `${window.location.origin}/game/prize/${code}`
    QRCode.toDataURL(url, {
      width: 480,
      margin: 1,
      color: { dark: "#1c1427", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [code])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(expiresAt - Date.now())
    }, 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  const expiryDate = new Date(expiresAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })
  const lessThanADay = remaining < 24 * 60 * 60 * 1000

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="flex flex-1 flex-col items-center justify-center py-4"
    >
      <div className="w-full max-w-sm">
        {/* Ticket */}
        <div className="relative rounded-3xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[3px] shadow-[0_22px_60px_rgba(245,165,36,0.35)]">
          <div className="relative overflow-hidden rounded-[calc(1.5rem-3px)] bg-[#fdfaf3] text-[#1c1427]">
            {/* Top: prize */}
            <div className="px-6 pb-5 pt-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-600">
                Ticket gagnant
              </p>
              <div className="mt-3 text-4xl" aria-hidden>
                {prize ? prizeEmoji(prize.type) : "🎁"}
              </div>
              <p className="mt-2 font-heading text-xl font-bold leading-tight">
                {prize?.name ?? "Votre lot"}
              </p>
              {storeName && <p className="mt-1 text-xs text-[#1c1427]/50">chez {storeName}</p>}
            </div>

            {/* Perforation */}
            <div className="relative flex items-center" aria-hidden>
              <span className="absolute -left-3 h-6 w-6 rounded-full bg-[#120d1a]" />
              <span className="mx-5 h-px flex-1 border-t-2 border-dashed border-[#1c1427]/15" />
              <span className="absolute -right-3 h-6 w-6 rounded-full bg-[#120d1a]" />
            </div>

            {/* Bottom: QR + code */}
            <div className="px-6 pb-6 pt-5 text-center">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-[#1c1427]/10 bg-white p-2.5 shadow-inner">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR code du lot ${code}`} className="h-full w-full" />
                ) : (
                  <span className="text-xs text-[#1c1427]/40">QR indisponible</span>
                )}
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#1c1427]/45">
                Code à présenter
              </p>
              <p className="mt-1 font-mono text-[26px] font-bold tracking-[0.35em] text-[#1c1427]">
                {code}
              </p>
              <p className="mt-3 text-[11px] text-[#1c1427]/50">
                Valable jusqu&apos;au {expiryDate}
                {lessThanADay && remaining > 0 && (
                  <span className="ml-1 font-mono font-semibold text-amber-700">
                    ({formatCountdown(remaining)})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Email confirmation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3"
        >
          <MailCheckIcon className="h-4 w-4 shrink-0 text-emerald-300" />
          <p className="text-xs text-emerald-100/80">
            Ticket envoyé à <span className="font-semibold">{email}</span>
          </p>
        </motion.div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-white/40">
          Présentez ce code au personnel lors de votre prochaine visite.
          <br />
          Une seule utilisation, sur place.
        </p>

        <MotionLink
          href="/"
          whileTap={{ scale: 0.96 }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-3.5 text-sm font-semibold text-white/80 backdrop-blur transition-colors hover:bg-white/10"
        >
          <UtensilsIcon className="h-4 w-4" />
          Découvrir la carte
        </MotionLink>
      </div>
    </motion.div>
  )
}
