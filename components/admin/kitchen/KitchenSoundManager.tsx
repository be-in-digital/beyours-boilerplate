"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface SoundChannelConfig {
  enabled: boolean
  volume: number
}

interface KitchenSoundManagerProps {
  storeId: Id<"stores">
  soundConfig: {
    newTicket: SoundChannelConfig
    overdue: SoundChannelConfig
    printerOffline: SoundChannelConfig
  }
  ticketCount?: number
}

function playBeep(
  ctx: AudioContext,
  freq: number,
  duration: number,
  volume: number
): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
  gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume / 100)), ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + duration / 1000
  )

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration / 1000)
}

export function KitchenSoundManager({
  storeId,
  soundConfig,
  ticketCount,
}: KitchenSoundManagerProps) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const [audioReady, setAudioReady] = useState(false)

  const handleActivate = useCallback(() => {
    if (audioReady) return
    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      playBeep(ctx, 800, 10, 1)
      setAudioReady(true)
    } catch {
      // AudioContext not available
    }
  }, [audioReady])

  const overdueCount = useQuery(api.kitchenTickets.getOverdueCount, { storeId })
  const printStuckCount = useQuery(api.kitchenTickets.getPrintStuckCount, { storeId })

  // New ticket detection
  const prevTicketCountRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!audioReady || ticketCount === undefined) return
    if (
      prevTicketCountRef.current !== undefined &&
      ticketCount > prevTicketCountRef.current &&
      soundConfig.newTicket.enabled &&
      audioCtxRef.current
    ) {
      playBeep(audioCtxRef.current, 800, 200, soundConfig.newTicket.volume)
    }
    prevTicketCountRef.current = ticketCount
  }, [ticketCount, audioReady, soundConfig.newTicket])

  // Overdue beep — anti-cacophony: 1 beep per store every 30s
  useEffect(() => {
    if (!audioReady || !overdueCount) return

    const fire = () => {
      if (audioCtxRef.current && soundConfig.overdue.enabled && overdueCount > 0) {
        playBeep(audioCtxRef.current, 400, 300, soundConfig.overdue.volume)
      }
    }

    fire()
    const id = setInterval(fire, 30_000)
    return () => clearInterval(id)
  }, [overdueCount, audioReady, soundConfig.overdue])

  // Print stuck beep — same 30s cadence
  useEffect(() => {
    if (!audioReady || !printStuckCount) return

    const fire = () => {
      if (audioCtxRef.current && soundConfig.printerOffline.enabled && printStuckCount > 0) {
        playBeep(audioCtxRef.current, 600, 500, soundConfig.printerOffline.volume)
      }
    }

    fire()
    const id = setInterval(fire, 30_000)
    return () => clearInterval(id)
  }, [printStuckCount, audioReady, soundConfig.printerOffline])

  const showBanner =
    audioReady &&
    ((overdueCount !== undefined && overdueCount > 0) ||
      (printStuckCount !== undefined && printStuckCount > 0))

  return (
    <>
      {!audioReady && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Activer les alertes sonores"
          onClick={handleActivate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleActivate()
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 cursor-pointer"
        >
          <div className="rounded-xl bg-white px-8 py-6 text-center shadow-2xl max-w-sm mx-4">
            <p className="text-base font-semibold text-gray-800">
              Cliquer pour activer les alertes sonores
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Requis par votre navigateur pour jouer des sons
            </p>
          </div>
        </div>
      )}

      {showBanner && (
        <div
          role="alert"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-3"
        >
          <span>
            {overdueCount !== undefined && overdueCount > 0 && (
              <>{overdueCount} ticket{overdueCount > 1 ? "s" : ""} en retard</>
            )}
            {overdueCount !== undefined &&
              overdueCount > 0 &&
              printStuckCount !== undefined &&
              printStuckCount > 0 && <> / </>}
            {printStuckCount !== undefined && printStuckCount > 0 && (
              <>
                {printStuckCount} non imprim{printStuckCount > 1 ? "es" : "e"}
              </>
            )}
          </span>
        </div>
      )}
    </>
  )
}
