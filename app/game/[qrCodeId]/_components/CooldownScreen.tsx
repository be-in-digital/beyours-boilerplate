"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { HourglassIcon, UtensilsIcon } from "lucide-react"
import { formatCountdown } from "@/lib/game"

const MotionLink = motion.create(Link)

/**
 * Already played: a live countdown ring until the next play.
 */

interface CooldownScreenProps {
  nextPlayAt: number
  onExpired?: () => void
}

const RING_RADIUS = 84
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const FULL_WINDOW_MS = 24 * 60 * 60 * 1000

export function CooldownScreen({ nextPlayAt, onExpired }: CooldownScreenProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, nextPlayAt - Date.now()))

  useEffect(() => {
    const interval = window.setInterval(() => {
      const value = Math.max(0, nextPlayAt - Date.now())
      setRemaining(value)
      if (value === 0) {
        window.clearInterval(interval)
        onExpired?.()
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [nextPlayAt, onExpired])

  const progress = Math.min(1, Math.max(0, remaining / FULL_WINDOW_MS))

  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 170, damping: 22 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div className="relative mb-7 h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="7"
          />
          <circle
            cx="100"
            cy="100"
            r={RING_RADIUS}
            fill="none"
            stroke="url(#cooldownGradient)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
          <defs>
            <linearGradient id="cooldownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <HourglassIcon className="mb-2 h-5 w-5 text-amber-300/80" />
          <p className="font-mono text-2xl font-bold tabular-nums text-white">
            {formatCountdown(remaining)}
          </p>
        </div>
      </div>

      <h2 className="font-heading text-2xl font-bold text-white/90">Vous avez déjà joué !</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/55">
        La chance revient toutes les 24h. Revenez tenter votre chance à votre prochaine visite.
      </p>

      <MotionLink
        href="/"
        whileTap={{ scale: 0.96 }}
        className="mt-9 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 py-4 font-heading text-base font-bold uppercase tracking-widest text-white shadow-[0_10px_35px_rgba(249,115,22,0.4)]"
      >
        <UtensilsIcon className="h-4 w-4" />
        Voir la carte
      </MotionLink>
    </motion.div>
  )
}
