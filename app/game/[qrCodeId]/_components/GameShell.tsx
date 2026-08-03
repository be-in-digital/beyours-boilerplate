"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Volume2Icon, VolumeXIcon } from "lucide-react"
import { ParticleEngine, gameSounds } from "@/lib/game"

/**
 * The game arena: dark ambient stage shared by every screen.
 * Owns the full-screen particle canvas and hands the engine to the flow.
 */

interface GameShellProps {
  storeName?: string
  tableNumber?: string
  onEngineReady?: (engine: ParticleEngine) => void
  children: React.ReactNode
}

export function GameShell({ storeName, tableNumber, onEngineReady, children }: GameShellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ParticleEngine | null>(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    setMuted(gameSounds.isMuted)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new ParticleEngine(canvas)
    engineRef.current = engine
    onEngineReady?.(engine)
    const handleResize = () => engine.resize()
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      engine.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleMute = () => {
    gameSounds.unlock()
    const next = !gameSounds.isMuted
    gameSounds.setMuted(next)
    setMuted(next)
    if (!next) gameSounds.pop()
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#120d1a] text-white">
      {/* Ambient stage lighting */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(249,115,22,0.16),transparent)]" />
        <div className="absolute bottom-[-30%] left-[-20%] h-[55vh] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.14),transparent)]" />
        <div className="absolute bottom-[-25%] right-[-15%] h-[50vh] w-[60vw] rounded-full bg-[radial-gradient(closest-side,rgba(245,165,36,0.1),transparent)]" />
        {/* Floating dust */}
        {DUST.map((dust, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-200/40"
            style={{ left: dust.x, top: dust.y }}
            animate={{ y: [0, -18, 0], opacity: [0.15, 0.5, 0.15] }}
            transition={{
              duration: dust.duration,
              repeat: Infinity,
              delay: dust.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="min-w-0">
          {storeName && (
            <p className="truncate font-heading text-sm font-semibold uppercase tracking-[0.25em] text-amber-300/90">
              {storeName}
            </p>
          )}
          {tableNumber && (
            <p className="text-[11px] text-white/40">Table {tableNumber}</p>
          )}
        </div>
        <button
          type="button"
          onClick={toggleMute}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur transition-colors hover:bg-white/10"
          aria-label={muted ? "Activer le son" : "Couper le son"}
        >
          {muted ? <VolumeXIcon className="h-4 w-4" /> : <Volume2Icon className="h-4 w-4" />}
        </button>
      </header>

      {/* Screen content */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-2">
        {children}
      </main>

      {/* Celebration particles above everything */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        aria-hidden
      />
    </div>
  )
}

/** Static dust positions — deterministic so SSR/CSR markup matches. */
const DUST = [
  { x: "8%", y: "18%", duration: 5.2, delay: 0 },
  { x: "22%", y: "64%", duration: 6.1, delay: 0.8 },
  { x: "37%", y: "31%", duration: 4.6, delay: 1.6 },
  { x: "58%", y: "74%", duration: 6.8, delay: 0.4 },
  { x: "71%", y: "22%", duration: 5.5, delay: 2.1 },
  { x: "84%", y: "52%", duration: 4.9, delay: 1.2 },
  { x: "93%", y: "80%", duration: 6.4, delay: 0.6 },
  { x: "14%", y: "88%", duration: 5.8, delay: 1.9 },
]
