"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { gameSounds, haptics, type ParticleEngine } from "@/lib/game"

/**
 * Scratch card with a real canvas foil layer.
 *
 * The first stroke commits the play (server resolves the outcome while the
 * player keeps scratching). Symbols flip from "?" to the resolved combo as
 * soon as the server answers; at ~55% cleared the rest of the foil dissolves.
 */

interface ScratchGameProps {
  /** Called on the first stroke. Resolve with didWin, or null on failure. */
  onScratchStart: () => Promise<boolean | null>
  /** Fired once the card is fully revealed. */
  onRevealed: (didWin: boolean) => void
  /** Full-screen particle engine from the shell (for foil shavings). */
  particles?: ParticleEngine | null
  prizeName?: string
}

type CardPhase = "idle" | "scratching" | "revealing" | "done" | "error"

const WIN_SYMBOLS = ["🎁", "🎁", "🎁"]
const LOSE_POOLS = [
  ["🍀", "⭐", "🍒"],
  ["🍒", "🍀", "⭐"],
  ["⭐", "🍒", "🍀"],
]
const REVEAL_THRESHOLD = 0.55
const BRUSH_RADIUS = 26

export function ScratchGame({ onScratchStart, onRevealed, particles, prizeName }: ScratchGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scratchingRef = useRef(false)
  const startedRef = useRef(false)
  const strokeCountRef = useRef(0)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastSoundRef = useRef(0)
  const resultRef = useRef<boolean | null>(null)
  const phaseRef = useRef<CardPhase>("idle")
  const onScratchStartRef = useRef(onScratchStart)
  const onRevealedRef = useRef(onRevealed)
  useEffect(() => {
    onScratchStartRef.current = onScratchStart
    onRevealedRef.current = onRevealed
  }, [onScratchStart, onRevealed])

  const [phase, setPhase] = useState<CardPhase>("idle")
  const [symbols, setSymbols] = useState<string[] | null>(null)
  const [revealedWin, setRevealedWin] = useState<boolean | null>(null)

  const changePhase = useCallback((next: CardPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  // ------------------------------------------------------------------
  // Foil rendering
  // ------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const paintFoil = () => {
      const { clientWidth, clientHeight } = container
      if (clientWidth === 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = clientWidth * dpr
      canvas.height = clientHeight * dpr
      canvas.style.width = `${clientWidth}px`
      canvas.style.height = `${clientHeight}px`
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Brushed metal base
      const base = ctx.createLinearGradient(0, 0, clientWidth, clientHeight)
      base.addColorStop(0, "#b8bcc6")
      base.addColorStop(0.25, "#e8eaf0")
      base.addColorStop(0.5, "#9aa0ab")
      base.addColorStop(0.75, "#dfe2e8")
      base.addColorStop(1, "#a7abb5")
      ctx.fillStyle = base
      ctx.fillRect(0, 0, clientWidth, clientHeight)

      // Grain
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * clientWidth
        const y = Math.random() * clientHeight
        ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.16)" : "rgba(60,64,72,0.12)"
        ctx.fillRect(x, y, 1.4, 1.4)
      }

      // Diagonal sheen bands
      for (let i = -2; i < 6; i++) {
        const sheen = ctx.createLinearGradient(
          i * 90,
          0,
          i * 90 + 130,
          clientHeight
        )
        sheen.addColorStop(0, "rgba(255,255,255,0)")
        sheen.addColorStop(0.5, "rgba(255,255,255,0.14)")
        sheen.addColorStop(1, "rgba(255,255,255,0)")
        ctx.fillStyle = sheen
        ctx.fillRect(0, 0, clientWidth, clientHeight)
      }

      // Embossed instruction
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      const fontSize = Math.max(15, clientWidth * 0.055)
      ctx.font = `800 ${fontSize}px var(--font-poppins), Poppins, sans-serif`
      ctx.fillStyle = "rgba(255,255,255,0.75)"
      ctx.fillText("GRATTEZ ICI", clientWidth / 2, clientHeight / 2 + 1.5)
      ctx.fillStyle = "rgba(90,95,105,0.85)"
      ctx.fillText("GRATTEZ ICI", clientWidth / 2, clientHeight / 2)
      ctx.font = `${fontSize * 1.15}px sans-serif`
      ctx.fillStyle = "rgba(90,95,105,0.6)"
      ctx.fillText("🪙", clientWidth / 2, clientHeight / 2 - fontSize * 1.7)
    }

    paintFoil()
    // No repaint on resize once scratching started — it would restore the foil
    const observer = new ResizeObserver(() => {
      if (!startedRef.current) paintFoil()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // ------------------------------------------------------------------
  // Reveal helpers
  // ------------------------------------------------------------------
  const finishReveal = useCallback(() => {
    if (phaseRef.current === "revealing" || phaseRef.current === "done") return
    changePhase("revealing")
    gameSounds.reveal()
    haptics.medium()
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.transition = "opacity 700ms ease"
      canvas.style.opacity = "0"
    }
    window.setTimeout(() => {
      changePhase("done")
      const didWin = resultRef.current === true
      setRevealedWin(didWin)
      window.setTimeout(() => onRevealedRef.current(didWin), 900)
    }, 750)
  }, [changePhase])

  const measureProgress = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return 0
    const step = 14
    const { width, height } = canvas
    let cleared = 0
    let total = 0
    try {
      const data = ctx.getImageData(0, 0, width, height).data
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          total++
          const alpha = data[(y * width + x) * 4 + 3]
          if (alpha !== undefined && alpha < 40) cleared++
        }
      }
    } catch {
      return 0
    }
    return total > 0 ? cleared / total : 0
  }, [])

  // ------------------------------------------------------------------
  // Scratch strokes
  // ------------------------------------------------------------------
  const scratchTo = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      ctx.save()
      ctx.globalCompositeOperation = "destination-out"
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = BRUSH_RADIUS * 2
      ctx.beginPath()
      const last = lastPointRef.current
      if (last) {
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else {
        ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      lastPointRef.current = { x, y }

      strokeCountRef.current++
      const now = performance.now()
      if (now - lastSoundRef.current > 70) {
        lastSoundRef.current = now
        gameSounds.scratch()
        haptics.tick()
        particles?.shavings(event.clientX, event.clientY)
      }

      if (strokeCountRef.current % 8 === 0) {
        const progress = measureProgress()
        if (progress >= REVEAL_THRESHOLD && resultRef.current !== null) {
          finishReveal()
        }
      }
    },
    [finishReveal, measureProgress, particles]
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current === "revealing" || phaseRef.current === "done") return
      gameSounds.unlock()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Some WebViews reject capture on synthetic pointers — scratching
        // still works, the finger just must stay on the card.
      }
      scratchingRef.current = true
      lastPointRef.current = null

      if (!startedRef.current) {
        startedRef.current = true
        changePhase("scratching")
        haptics.light()
        void onScratchStartRef.current().then((didWin) => {
          if (didWin === null) {
            // Failed resolution (network…): let the next stroke retry
            startedRef.current = false
            changePhase("error")
            return
          }
          resultRef.current = didWin
          const pool = LOSE_POOLS[Math.floor(Math.random() * LOSE_POOLS.length)]!
          setSymbols(didWin ? WIN_SYMBOLS : pool)
          // If the player already cleared enough while waiting, reveal now
          if (measureProgress() >= REVEAL_THRESHOLD) finishReveal()
        })
      }
      scratchTo(event)
    },
    [changePhase, finishReveal, measureProgress, scratchTo]
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!scratchingRef.current) return
      scratchTo(event)
    },
    [scratchTo]
  )

  const handlePointerUp = useCallback(() => {
    scratchingRef.current = false
    lastPointRef.current = null
    if (phaseRef.current === "scratching" && resultRef.current !== null) {
      if (measureProgress() >= REVEAL_THRESHOLD) finishReveal()
    }
  }, [finishReveal, measureProgress])

  const displaySymbols = symbols ?? ["?", "?", "?"]

  return (
    <div className="flex w-full flex-col items-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, rotateX: 18 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 18 }}
        className="w-full max-w-sm"
        style={{ perspective: 800, willChange: "transform" }}
      >
        <motion.div
          animate={phase === "idle" ? { y: [0, -6, 0] } : { y: 0 }}
          transition={
            phase === "idle"
              ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.2 }
          }
          className="rounded-3xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 p-[3px] shadow-[0_18px_50px_rgba(245,165,36,0.3)]"
        >
          <div className="rounded-[calc(1.5rem-3px)] bg-[#1c1427] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-amber-300">
                Ticket Gagnant ?
              </p>
              <span className="text-lg">🪙</span>
            </div>

            {/* Scratch zone: symbols underneath, foil canvas on top */}
            <div
              ref={containerRef}
              className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl"
            >
              <div className="absolute inset-0 flex items-center justify-center gap-3 bg-gradient-to-b from-[#2b2140] to-[#191225] px-4">
                {displaySymbols.map((symbol, i) => (
                  <AnimatePresence key={i} mode="popLayout">
                    <motion.div
                      key={symbol}
                      initial={{ rotateY: 90, opacity: 0 }}
                      animate={{ rotateY: 0, opacity: 1 }}
                      exit={{ rotateY: -90, opacity: 0 }}
                      transition={{ delay: i * 0.12, type: "spring", stiffness: 260, damping: 20 }}
                      className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-3xl shadow-inner sm:h-20 sm:w-20 sm:text-4xl"
                    >
                      {symbol}
                    </motion.div>
                  </AnimatePresence>
                ))}
              </div>
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute inset-0 h-full w-full touch-none select-none"
                style={{ cursor: "crosshair" }}
                aria-label="Carte à gratter — frottez pour révéler"
                role="img"
              />
            </div>

            <p className="mt-4 text-center text-xs text-white/50">
              {phase === "idle" && "Frottez la surface argentée avec votre doigt"}
              {phase === "scratching" && "Continuez… 3 symboles identiques = gagné !"}
              {phase === "revealing" && "Révélation…"}
              {phase === "done" &&
                (revealedWin
                  ? `3 symboles ! ${prizeName ?? "Vous avez gagné"} 🎉`
                  : "Pas les 3 symboles cette fois…")}
              {phase === "error" && "Impossible de lancer la partie — réessayez."}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {phase === "idle" && (
        <motion.div
          animate={{ y: [0, 8, 0], x: [0, 14, -6, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none mt-3 text-3xl"
          aria-hidden
        >
          👆
        </motion.div>
      )}
    </div>
  )
}
