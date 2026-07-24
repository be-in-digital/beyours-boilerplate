"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { CheckIcon, UnlockIcon, LockIcon, ExternalLinkIcon } from "lucide-react"
import { gameSounds, haptics } from "@/lib/game"

/**
 * Action "parrainage" : proposée une fois toutes les actions sociales faites.
 * Partager = jouer tout de suite (comme les autres actions). L'ami reçoit un
 * tour offert via le lien ; quand il joue, le parrain gagne un tour bonus.
 */

interface ReferralScreenProps {
  qrCode: string
  initialShareCode: string | null
  friendRewardLabel?: string
  mintShareCode: () => Promise<string>
  onDone: () => void
}

export function ReferralScreen({
  qrCode,
  initialShareCode,
  friendRewardLabel,
  mintShareCode,
  onDone,
}: ReferralScreenProps) {
  const [shareCode, setShareCode] = useState<string | null>(initialShareCode)
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const mintingRef = useRef(false)

  useEffect(() => {
    if (shareCode || mintingRef.current) return
    mintingRef.current = true
    void mintShareCode()
      .then((code) => setShareCode(code))
      .catch(() => {
        mintingRef.current = false
      })
  }, [shareCode, mintShareCode])

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const shareUrl = shareCode ? `${origin}/game/${qrCode}?ref=${shareCode}` : ""

  const doCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setShared(true)
      haptics.light()
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard indisponible : l'utilisateur copie à la main */
    }
  }

  const doShare = async () => {
    if (!shareUrl) return
    setShared(true)
    haptics.light()
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Un cadeau vous attend",
          text: "Je vous invite à tenter votre chance 🎁",
          url: shareUrl,
        })
      } catch {
        /* partage annulé : pas grave, le lien reste copiable */
      }
    } else {
      await doCopy()
    }
  }

  const unlock = () => {
    if (verifying) return
    gameSounds.pop()
    haptics.medium()
    setVerifying(true)
    window.setTimeout(() => onDone(), 1400)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", stiffness: 200, damping: 24 }}
      className="flex flex-1 flex-col pt-4"
    >
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 text-4xl" aria-hidden>
          👋
        </div>
        <h2 className="font-heading text-2xl font-bold">Invitez un ami</h2>
        <p className="mt-1.5 max-w-xs text-sm text-white/55 mx-auto">
          Vous avez déjà tout fait. Partagez votre lien et rejouez tout de
          suite. {friendRewardLabel ? `Votre ami reçoit ${friendRewardLabel}.` : "Votre ami reçoit un tour offert."}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Lien de parrainage */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">
            Votre lien
          </p>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
            <span className="flex-1 truncate text-[13px] text-white/70">
              {shareUrl || "Génération du lien…"}
            </span>
            <button
              type="button"
              onClick={doCopy}
              disabled={!shareUrl}
              className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition-colors hover:bg-white/15 disabled:opacity-40"
            >
              {copied ? (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <CheckIcon className="h-3 w-3" /> Copié
                </span>
              ) : (
                "Copier"
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={doShare}
            disabled={!shareUrl}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm font-semibold text-white/85 transition-colors hover:bg-white/15 disabled:opacity-40"
          >
            <ExternalLinkIcon className="h-4 w-4" />
            Partager le lien
          </button>
        </div>

        <p className="mt-4 max-w-[15rem] text-center text-[11px] leading-relaxed text-white/35">
          Quand votre ami joue, vous gagnez un tour bonus. C&apos;est notre façon
          de dire merci.
        </p>
      </div>

      <div className="mt-auto pt-6">
        <motion.button
          type="button"
          onClick={unlock}
          disabled={!shared || verifying}
          whileTap={shared && !verifying ? { scale: 0.95 } : undefined}
          animate={
            shared && !verifying
              ? { scale: [1, 1.04, 1], transition: { duration: 1.4, repeat: Infinity } }
              : {}
          }
          className={`flex w-full items-center justify-center gap-2 rounded-full py-4 font-heading text-base font-bold uppercase tracking-widest transition-all ${
            shared && !verifying
              ? "bg-gradient-to-b from-amber-400 to-orange-600 text-white shadow-[0_10px_35px_rgba(249,115,22,0.5)]"
              : "cursor-not-allowed bg-white/10 text-white/35"
          }`}
        >
          {verifying ? (
            "Validation…"
          ) : shared ? (
            <>
              <UnlockIcon className="h-4 w-4" /> Jouer maintenant
            </>
          ) : (
            <>
              <LockIcon className="h-4 w-4" /> Partagez pour jouer
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}
