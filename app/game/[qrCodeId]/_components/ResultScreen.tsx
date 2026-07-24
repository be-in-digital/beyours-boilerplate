"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { GiftIcon, UtensilsIcon } from "lucide-react"
import { gameSounds, haptics, type GamePrize } from "@/lib/game"
import { prizeEmoji } from "./WelcomeScreen"

const MotionLink = motion.create(Link)

/**
 * The payoff. Win: flash, rotating god-rays, 3D prize reveal.
 * Lose: warm, quick, and pointed back at the menu.
 */

interface ResultScreenProps {
  didWin: boolean
  prize: GamePrize | null
  winTitle: string
  winDescription?: string
  loseTitle: string
  loseDescription?: string
  onClaim: () => void
  onFinishLose: () => void
}

export function ResultScreen({
  didWin,
  prize,
  winTitle,
  winDescription,
  loseTitle,
  loseDescription,
  onClaim,
  onFinishLose,
}: ResultScreenProps) {
  const [flash, setFlash] = useState(didWin)

  useEffect(() => {
    if (didWin) {
      gameSounds.fanfare()
      haptics.success()
      const timeout = window.setTimeout(() => setFlash(false), 420)
      return () => window.clearTimeout(timeout)
    }
    gameSounds.womp()
    haptics.fail()
    return undefined
  }, [didWin])

  if (!didWin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 22 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <motion.div
          initial={{ scale: 0.7, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-5xl"
        >
          🍀
        </motion.div>
        <h2 className="font-heading text-3xl font-bold text-white/90">{loseTitle}</h2>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
          {loseDescription ?? "La chance tourne… littéralement. Retentez votre chance demain !"}
        </p>
        <div className="mt-10 w-full max-w-xs space-y-3">
          <MotionLink
            href="/"
            whileTap={{ scale: 0.96 }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 py-4 font-heading text-base font-bold uppercase tracking-widest text-white shadow-[0_10px_35px_rgba(249,115,22,0.4)]"
          >
            <UtensilsIcon className="h-4 w-4" />
            Voir la carte
          </MotionLink>
          <button
            type="button"
            onClick={onFinishLose}
            className="w-full py-2 text-xs font-medium text-white/40 transition-colors hover:text-white/60"
          >
            Quand pourrai-je rejouer ?
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      {/* Victory flash */}
      {flash && (
        <motion.div
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed inset-0 z-30 bg-amber-50"
          aria-hidden
        />
      )}

      {/* Rotating god-rays */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <motion.div
          className="h-[540px] w-[540px] opacity-25"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg 14deg, rgba(251,191,36,0.55) 14deg 26deg, transparent 26deg 40deg, rgba(251,191,36,0.4) 40deg 52deg, transparent 52deg 66deg, rgba(251,191,36,0.55) 66deg 78deg, transparent 78deg 92deg, rgba(251,191,36,0.4) 92deg 104deg, transparent 104deg 118deg, rgba(251,191,36,0.55) 118deg 130deg, transparent 130deg 144deg, rgba(251,191,36,0.4) 144deg 156deg, transparent 156deg 170deg, rgba(251,191,36,0.55) 170deg 182deg, transparent 182deg 196deg, rgba(251,191,36,0.4) 196deg 208deg, transparent 208deg 222deg, rgba(251,191,36,0.55) 222deg 234deg, transparent 234deg 248deg, rgba(251,191,36,0.4) 248deg 260deg, transparent 260deg 274deg, rgba(251,191,36,0.55) 274deg 286deg, transparent 286deg 300deg, rgba(251,191,36,0.4) 300deg 312deg, transparent 312deg 326deg, rgba(251,191,36,0.55) 326deg 338deg, transparent 338deg 360deg)",
            maskImage: "radial-gradient(circle, black 0%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 68%)",
            willChange: "transform",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <motion.p
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="relative font-heading text-sm font-bold uppercase tracking-[0.4em] text-amber-300"
      >
        Jackpot
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.32, type: "spring", stiffness: 210, damping: 15 }}
        className="relative mt-2 font-heading text-4xl font-bold"
      >
        <span className="bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(245,165,36,0.5)]">
          {winTitle}
        </span>
      </motion.h2>

      {winDescription && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative mt-2 text-sm text-white/60"
        >
          {winDescription}
        </motion.p>
      )}

      {/* Prize card — 3D flip reveal */}
      <div className="relative mt-8 w-full max-w-xs" style={{ perspective: 900 }}>
        <motion.div
          initial={{ rotateY: 92, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ delay: 0.55, type: "spring", stiffness: 130, damping: 15 }}
          className="rounded-3xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[3px] shadow-[0_22px_60px_rgba(245,165,36,0.4)]"
          style={{ willChange: "transform" }}
        >
          <div className="relative overflow-hidden rounded-[calc(1.5rem-3px)] bg-[#1c1427] px-6 py-8">
            {/* Shine sweep */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 w-24 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              initial={{ left: "-30%" }}
              animate={{ left: "120%" }}
              transition={{ delay: 1.1, duration: 0.9, ease: "easeInOut" }}
              aria-hidden
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 320, damping: 12 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400/15 text-5xl"
            >
              {prize ? prizeEmoji(prize.type) : "🎁"}
            </motion.div>
            <p className="mt-5 font-heading text-2xl font-bold text-white">
              {prize?.name ?? "Votre lot"}
            </p>
            {prize?.description && (
              <p className="mt-1.5 text-sm text-white/55">{prize.description}</p>
            )}
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-amber-300/70">
              Valable {prize?.validityDays ?? 7} jours
            </p>
          </div>
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={() => {
          gameSounds.pop()
          haptics.light()
          onClaim()
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.35 }}
        whileTap={{ scale: 0.95 }}
        className="relative mt-9 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 py-4 font-heading text-base font-bold uppercase tracking-widest text-white shadow-[0_10px_35px_rgba(249,115,22,0.5)]"
      >
        <GiftIcon className="h-4 w-4" />
        Récupérer mon lot
      </motion.button>
    </div>
  )
}
