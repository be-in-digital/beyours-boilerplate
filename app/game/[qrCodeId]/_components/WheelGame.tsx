"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { gameSounds, haptics } from "@/lib/game"
import {
  finalRotationForSegment,
  segmentAtPointer,
  wheelEase,
  type WheelSegment,
} from "@/lib/game/wheel"

/**
 * Casino-grade wheel of fortune, rendered on canvas.
 *
 * The wheel face (segments, labels, rim) is pre-rendered to an offscreen
 * canvas and blitted rotated each frame; LEDs, pointer and hub are drawn
 * live. The outcome is server-resolved: on launch the wheel free-spins,
 * and once the target segment is known it decelerates onto it.
 */

interface WheelGameProps {
  segments: WheelSegment[]
  /** Called at launch. Resolve with the target segment index, or null on failure. */
  onSpin: () => Promise<number | null>
  /** Fired once the wheel has fully settled on the target. */
  onLanded: (segmentIndex: number) => void
  disabled?: boolean
}

type SpinPhase = "ready" | "charging" | "freespin" | "decel" | "settle" | "done" | "error"

const LED_COUNT = 20
const FREESPIN_SPEED = 11 // rad/s while waiting for the server
const REDUCED_MOTION_DURATION = 1.4

interface SpinState {
  phase: SpinPhase
  rotation: number
  // Deceleration plan
  decelStart: number
  decelFrom: number
  decelTarget: number
  decelDuration: number
  // Pointer spring
  pointerAngle: number
  pointerVelocity: number
  lastSegment: number
  targetIndex: number | null
  power: number
  chargeDirection: 1 | -1
  settleStart: number
  ledFlashUntil: number
}

export function WheelGame({ segments, onSpin, onLanded, disabled }: WheelGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faceRef = useRef<HTMLCanvasElement | null>(null)
  const sizeRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef(0)
  const spinRef = useRef<SpinState>({
    phase: "ready",
    rotation: 0,
    decelStart: 0,
    decelFrom: 0,
    decelTarget: 0,
    decelDuration: 0,
    pointerAngle: 0,
    pointerVelocity: 0,
    lastSegment: 0,
    targetIndex: null,
    power: 0,
    chargeDirection: 1,
    settleStart: 0,
    ledFlashUntil: 0,
  })
  const dragRef = useRef<{
    active: boolean
    lastAngle: number
    samples: { t: number; angle: number }[]
  }>({ active: false, lastAngle: 0, samples: [] })
  const reducedMotionRef = useRef(false)
  const onSpinRef = useRef(onSpin)
  const onLandedRef = useRef(onLanded)
  useEffect(() => {
    onSpinRef.current = onSpin
    onLandedRef.current = onLanded
  }, [onSpin, onLanded])

  const [phase, setPhase] = useState<SpinPhase>("ready")
  const [chargePower, setChargePower] = useState(0)

  const setSpinPhase = useCallback((next: SpinPhase) => {
    spinRef.current.phase = next
    setPhase(next)
  }, [])

  // ------------------------------------------------------------------
  // Static face pre-render
  // ------------------------------------------------------------------
  const renderFace = useCallback(
    (size: number, dpr: number) => {
      const face = document.createElement("canvas")
      face.width = size * dpr
      face.height = size * dpr
      const ctx = face.getContext("2d")
      if (!ctx) return face
      ctx.scale(dpr, dpr)

      const center = size / 2
      const outerRadius = center - 4
      const rimWidth = size * 0.062
      const faceRadius = outerRadius - rimWidth
      const arc = (Math.PI * 2) / segments.length

      // Rim: brushed metal ring
      const rimGradient = ctx.createLinearGradient(0, 0, size, size)
      rimGradient.addColorStop(0, "#8a6a1f")
      rimGradient.addColorStop(0.22, "#f7de8b")
      rimGradient.addColorStop(0.42, "#b8860b")
      rimGradient.addColorStop(0.62, "#fff3c4")
      rimGradient.addColorStop(0.82, "#9a7418")
      rimGradient.addColorStop(1, "#6e5314")
      ctx.beginPath()
      ctx.arc(center, center, outerRadius, 0, Math.PI * 2)
      ctx.fillStyle = rimGradient
      ctx.fill()

      // Rim inner lip
      ctx.beginPath()
      ctx.arc(center, center, faceRadius + 2, 0, Math.PI * 2)
      ctx.fillStyle = "#241a08"
      ctx.fill()

      // Segments
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!
        const start = i * arc
        const end = start + arc
        ctx.beginPath()
        ctx.moveTo(center, center)
        ctx.arc(center, center, faceRadius, start, end)
        ctx.closePath()
        const gradient = ctx.createRadialGradient(
          center,
          center,
          faceRadius * 0.15,
          center,
          center,
          faceRadius
        )
        gradient.addColorStop(0, lighten(segment.color, 0.32))
        gradient.addColorStop(0.65, segment.color)
        gradient.addColorStop(1, darken(segment.color, 0.28))
        ctx.fillStyle = gradient
        ctx.fill()

        // Separator
        ctx.save()
        ctx.translate(center, center)
        ctx.rotate(start)
        ctx.beginPath()
        ctx.moveTo(faceRadius * 0.12, 0)
        ctx.lineTo(faceRadius, 0)
        ctx.strokeStyle = "rgba(255, 226, 130, 0.55)"
        ctx.lineWidth = 1.4
        ctx.stroke()
        ctx.restore()
      }

      // Labels
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!
        const angle = i * arc + arc / 2
        ctx.save()
        ctx.translate(center, center)
        ctx.rotate(angle)
        ctx.textAlign = "right"
        ctx.textBaseline = "middle"
        const label = segment.label.length > 14 ? `${segment.label.slice(0, 13)}…` : segment.label
        let fontSize = size * 0.042
        ctx.font = `700 ${fontSize}px var(--font-poppins), Poppins, sans-serif`
        const maxWidth = faceRadius * 0.62
        while (ctx.measureText(label).width > maxWidth && fontSize > 8) {
          fontSize -= 1
          ctx.font = `700 ${fontSize}px var(--font-poppins), Poppins, sans-serif`
        }
        ctx.fillStyle = "rgba(0,0,0,0.35)"
        ctx.fillText(label, faceRadius * 0.9, 1.5)
        ctx.fillStyle = segment.textColor
        ctx.fillText(label, faceRadius * 0.9, 0)
        if (segment.isWinning) {
          ctx.font = `${size * 0.036}px sans-serif`
          ctx.fillText("🎁", faceRadius * 0.96 + size * 0.033, 0)
        }
        ctx.restore()
      }

      // Soft vignette on the face
      const vignette = ctx.createRadialGradient(
        center,
        center,
        faceRadius * 0.5,
        center,
        center,
        faceRadius
      )
      vignette.addColorStop(0, "rgba(0,0,0,0)")
      vignette.addColorStop(1, "rgba(0,0,0,0.22)")
      ctx.beginPath()
      ctx.arc(center, center, faceRadius, 0, Math.PI * 2)
      ctx.fillStyle = vignette
      ctx.fill()

      return face
    },
    [segments]
  )

  // ------------------------------------------------------------------
  // Frame loop
  // ------------------------------------------------------------------
  const drawFrame = useCallback((now: number) => {
    const canvas = canvasRef.current
    const face = faceRef.current
    const size = sizeRef.current
    if (!canvas || !face || size === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const state = spinRef.current
    const dt = Math.min((now - lastFrameRef.current) / 1000, 0.05)
    lastFrameRef.current = now

    // --- Physics updates -------------------------------------------
    if (state.phase === "charging") {
      const speed = 1.6
      state.power += speed * dt * state.chargeDirection
      if (state.power >= 1) {
        state.power = 1
        state.chargeDirection = -1
      } else if (state.power <= 0.25) {
        state.power = 0.25
        state.chargeDirection = 1
      }
      setChargePower(state.power)
      // Tension jitter while charging
      state.rotation += Math.sin(now / 28) * 0.0009 * state.power
    } else if (state.phase === "freespin") {
      state.rotation += FREESPIN_SPEED * dt
    } else if (state.phase === "decel") {
      const t = Math.min((now - state.decelStart) / state.decelDuration, 1)
      state.rotation =
        state.decelFrom + (state.decelTarget - state.decelFrom) * wheelEase(t)
      if (t >= 1) {
        state.rotation = state.decelTarget
        state.settleStart = now
        state.phase = "settle"
        haptics.medium()
      }
    } else if (state.phase === "settle") {
      // Tiny recoil against the last peg, springing back to rest
      const elapsed = (now - state.settleStart) / 1000
      const recoil = Math.exp(-elapsed * 9) * Math.sin(elapsed * 26) * 0.012
      state.rotation = state.decelTarget + recoil
      if (elapsed > 0.55) {
        state.rotation = state.decelTarget
        state.phase = "done"
        state.ledFlashUntil = now + 1600
        setPhase("done")
        const landed = segmentAtPointer(state.rotation, Math.max(segments.length, 1))
        window.setTimeout(() => onLandedRef.current(landed), 700)
      }
    }

    // --- Peg ticks + pointer spring --------------------------------
    const segmentCount = Math.max(segments.length, 1)
    const currentSegment = segmentAtPointer(state.rotation, segmentCount)
    if (
      currentSegment !== state.lastSegment &&
      (state.phase === "freespin" || state.phase === "decel" || state.phase === "settle")
    ) {
      state.lastSegment = currentSegment
      let speedNorm = 0.5
      if (state.phase === "decel") {
        const t = Math.min((now - state.decelStart) / state.decelDuration, 1)
        speedNorm = 1 - t
      } else if (state.phase === "freespin") {
        speedNorm = 1
      }
      state.pointerVelocity += 9 + speedNorm * 9
      gameSounds.tick(speedNorm)
      haptics.tick()
      if (state.phase === "decel" && speedNorm < 0.12) {
        gameSounds.suspense()
      }
    } else if (currentSegment !== state.lastSegment) {
      state.lastSegment = currentSegment
    }

    // Pointer spring integration (stiff spring, medium damping)
    const stiffness = 320
    const damping = 16
    const acceleration = -stiffness * state.pointerAngle - damping * state.pointerVelocity
    state.pointerVelocity += acceleration * dt
    state.pointerAngle += state.pointerVelocity * dt
    state.pointerAngle = Math.min(Math.max(state.pointerAngle, -0.05), 0.62)

    // --- Draw ------------------------------------------------------
    const center = size / 2
    ctx.clearRect(0, 0, size, size)

    // Ambient glow under the wheel
    const glow = ctx.createRadialGradient(center, center, size * 0.2, center, center, size * 0.62)
    const glowIntensity =
      state.phase === "freespin" || state.phase === "decel" ? 0.34 : state.phase === "done" ? 0.5 : 0.22
    glow.addColorStop(0, `rgba(251, 191, 36, ${glowIntensity})`)
    glow.addColorStop(1, "rgba(251, 191, 36, 0)")
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)

    // Rotated wheel face
    ctx.save()
    ctx.translate(center, center)
    ctx.rotate(state.rotation)
    ctx.drawImage(face, -center, -center, size, size)
    ctx.restore()

    // LEDs on the rim (fixed positions)
    const ledRadius = center - 4 - size * 0.031
    for (let i = 0; i < LED_COUNT; i++) {
      const angle = (i / LED_COUNT) * Math.PI * 2 - Math.PI / 2
      let on = false
      if (now < state.ledFlashUntil) {
        on = Math.floor(now / 110) % 2 === 0
      } else if (state.phase === "freespin" || state.phase === "decel") {
        on = (i + Math.floor(now / 70)) % 3 === 0
      } else {
        on = (i + Math.floor(now / 420)) % 4 === 0
      }
      const x = center + Math.cos(angle) * ledRadius
      const y = center + Math.sin(angle) * ledRadius
      const bulb = size * 0.014
      if (on) {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, bulb * 3.2)
        halo.addColorStop(0, "rgba(255, 240, 180, 0.9)")
        halo.addColorStop(1, "rgba(255, 240, 180, 0)")
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(x, y, bulb * 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(x, y, bulb, 0, Math.PI * 2)
      ctx.fillStyle = on ? "#fff7d6" : "#3d2f10"
      ctx.fill()
    }

    // Center hub (fixed cap)
    const hubRadius = size * 0.108
    const hub = ctx.createRadialGradient(
      center - hubRadius * 0.35,
      center - hubRadius * 0.35,
      hubRadius * 0.1,
      center,
      center,
      hubRadius
    )
    hub.addColorStop(0, "#fff3c4")
    hub.addColorStop(0.45, "#e5b53b")
    hub.addColorStop(1, "#8a6a1f")
    ctx.beginPath()
    ctx.arc(center, center, hubRadius, 0, Math.PI * 2)
    ctx.fillStyle = hub
    ctx.fill()
    ctx.beginPath()
    ctx.arc(center, center, hubRadius * 0.6, 0, Math.PI * 2)
    ctx.fillStyle = "#241a08"
    ctx.fill()
    ctx.font = `${hubRadius * 0.72}px sans-serif`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("🎰", center, center + 1)

    // Pointer (top), springs on every peg crossing
    ctx.save()
    ctx.translate(center, center - (center - 4) + size * 0.012)
    ctx.rotate(state.pointerAngle)
    const pointerHeight = size * 0.088
    const pointerWidth = size * 0.052
    const pointerGradient = ctx.createLinearGradient(0, 0, 0, pointerHeight)
    pointerGradient.addColorStop(0, "#fff3c4")
    pointerGradient.addColorStop(0.5, "#f5a524")
    pointerGradient.addColorStop(1, "#c2410c")
    ctx.beginPath()
    ctx.moveTo(-pointerWidth / 2, -size * 0.006)
    ctx.lineTo(pointerWidth / 2, -size * 0.006)
    ctx.lineTo(0, pointerHeight)
    ctx.closePath()
    ctx.fillStyle = pointerGradient
    ctx.shadowColor = "rgba(0,0,0,0.45)"
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 2
    ctx.fill()
    ctx.shadowColor = "transparent"
    ctx.beginPath()
    ctx.arc(0, size * 0.004, pointerWidth * 0.22, 0, Math.PI * 2)
    ctx.fillStyle = "#fff7e0"
    ctx.fill()
    ctx.restore()
  }, [segments])

  // Persistent rAF loop while mounted (LEDs breathe even when idle)
  useEffect(() => {
    lastFrameRef.current = performance.now()
    const loop = (now: number) => {
      drawFrame(now)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [drawFrame])

  // Sizing + face rendering
  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const applySize = () => {
      const size = Math.min(container.clientWidth, 430)
      if (size <= 0) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = size
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      const ctx = canvas.getContext("2d")
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      faceRef.current = renderFace(size, dpr)
    }

    applySize()
    const observer = new ResizeObserver(applySize)
    observer.observe(container)
    return () => observer.disconnect()
  }, [renderFace])

  // ------------------------------------------------------------------
  // Launch sequence
  // ------------------------------------------------------------------
  const launch = useCallback(
    async (power: number) => {
      const state = spinRef.current
      if (state.phase !== "ready" && state.phase !== "charging" && state.phase !== "error") return
      gameSounds.unlock()
      gameSounds.chargeEnd()
      gameSounds.whoosh()
      haptics.light()
      setSpinPhase("freespin")

      const spinStartedAt = performance.now()
      const targetIndex = await onSpinRef.current()
      if (targetIndex === null) {
        setSpinPhase("error")
        return
      }

      // Let the free spin breathe for at least 500ms so short network
      // round-trips still read as a real launch.
      const elapsed = performance.now() - spinStartedAt
      const waitMore = Math.max(0, 500 - elapsed)
      window.setTimeout(() => {
        const current = spinRef.current
        current.targetIndex = targetIndex
        const reduced = reducedMotionRef.current
        const turns = reduced ? 1 : 4 + Math.round(power * 3)
        const target = finalRotationForSegment(targetIndex, segments.length, { turns })
        // Continue forward from the live rotation, never backward
        const base =
          Math.ceil(current.rotation / (Math.PI * 2)) * Math.PI * 2
        current.decelFrom = current.rotation
        current.decelTarget = base + target
        current.decelDuration = (reduced ? REDUCED_MOTION_DURATION : 5.6 + power * 2.2) * 1000
        current.decelStart = performance.now()
        setSpinPhase("decel")
      }, waitMore)
    },
    [segments.length, setSpinPhase]
  )

  // ------------------------------------------------------------------
  // Gestures: press-and-hold charge on the button, flick on the wheel
  // ------------------------------------------------------------------
  const handleChargeStart = useCallback(() => {
    if (disabled) return
    const state = spinRef.current
    // "error" allows retrying after a failed play resolution
    if (state.phase !== "ready" && state.phase !== "error") return
    gameSounds.unlock()
    gameSounds.chargeStart()
    haptics.light()
    state.power = 0.25
    state.chargeDirection = 1
    setSpinPhase("charging")
  }, [disabled, setSpinPhase])

  const handleChargeEnd = useCallback(() => {
    const state = spinRef.current
    if (state.phase !== "charging") return
    void launch(state.power)
  }, [launch])

  const wheelAngleFromEvent = useCallback((event: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left - rect.width / 2
    const y = event.clientY - rect.top - rect.height / 2
    return Math.atan2(y, x)
  }, [])

  const handleWheelPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      const state = spinRef.current
      if (state.phase !== "ready") return
      gameSounds.unlock()
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Synthetic pointers can reject capture — the drag still tracks.
      }
      dragRef.current = {
        active: true,
        lastAngle: wheelAngleFromEvent(event),
        samples: [{ t: performance.now(), angle: state.rotation }],
      }
    },
    [disabled, wheelAngleFromEvent]
  )

  const handleWheelPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      const state = spinRef.current
      if (!drag.active || state.phase !== "ready") return
      const angle = wheelAngleFromEvent(event)
      let delta = angle - drag.lastAngle
      if (delta > Math.PI) delta -= Math.PI * 2
      if (delta < -Math.PI) delta += Math.PI * 2
      drag.lastAngle = angle
      state.rotation += delta
      const now = performance.now()
      drag.samples.push({ t: now, angle: state.rotation })
      while (drag.samples.length > 2 && now - drag.samples[0]!.t > 120) {
        drag.samples.shift()
      }
      const segment = segmentAtPointer(state.rotation, Math.max(segments.length, 1))
      if (segment !== state.lastSegment) {
        state.lastSegment = segment
        state.pointerVelocity += 6
        gameSounds.tick(0.3)
        haptics.tick()
      }
    },
    [segments.length, wheelAngleFromEvent]
  )

  const handleWheelPointerUp = useCallback(() => {
    const drag = dragRef.current
    const state = spinRef.current
    if (!drag.active) return
    drag.active = false
    if (state.phase !== "ready") return
    const samples = drag.samples
    if (samples.length >= 2) {
      const first = samples[0]!
      const last = samples[samples.length - 1]!
      const dt = (last.t - first.t) / 1000
      const velocity = dt > 0 ? (last.angle - first.angle) / dt : 0
      if (Math.abs(velocity) > 3.2) {
        const power = Math.min(1, Math.abs(velocity) / 18)
        void launch(Math.max(0.45, power))
      }
    }
  }, [launch])

  const spinning = phase === "freespin" || phase === "decel" || phase === "settle"

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <motion.div
        initial={{ scale: 0.86, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 19 }}
        className="relative"
        style={{ willChange: "transform" }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleWheelPointerDown}
          onPointerMove={handleWheelPointerMove}
          onPointerUp={handleWheelPointerUp}
          onPointerCancel={handleWheelPointerUp}
          className="touch-none select-none"
          style={{ cursor: spinning ? "default" : "grab" }}
          aria-label="Roue de la fortune — glissez pour lancer"
          role="img"
        />
      </motion.div>

      <div className="mt-6 flex w-full max-w-xs flex-col items-center gap-3">
        {phase === "charging" && (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-none"
              style={{ width: `${chargePower * 100}%` }}
            />
          </div>
        )}
        <motion.button
          type="button"
          onPointerDown={handleChargeStart}
          onPointerUp={handleChargeEnd}
          onPointerLeave={handleChargeEnd}
          onPointerCancel={handleChargeEnd}
          disabled={disabled || spinning || phase === "done"}
          whileTap={{ scale: 0.94 }}
          className="relative w-full touch-none select-none rounded-full bg-gradient-to-b from-amber-400 to-orange-600 px-10 py-4 font-heading text-lg font-bold uppercase tracking-widest text-white shadow-[0_8px_28px_rgba(249,115,22,0.45),inset_0_1px_0_rgba(255,255,255,0.4)] transition-opacity disabled:opacity-40"
        >
          {phase === "charging"
            ? "Relâchez !"
            : spinning
              ? "Bonne chance…"
              : phase === "done"
                ? "🎉"
                : phase === "error"
                  ? "Réessayer"
                  : "Tenez pour lancer"}
          {phase === "ready" && !disabled && (
            <motion.span
              className="absolute inset-0 rounded-full ring-2 ring-amber-300/60"
              animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.button>
        <p className="text-xs text-white/50">
          {spinning ? "La roue décide…" : "Ou faites tourner la roue d'un geste"}
        </p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Color helpers (hex → shade)
// ------------------------------------------------------------------
function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgb(${clampChannel(r + (255 - r) * amount)}, ${clampChannel(
    g + (255 - g) * amount
  )}, ${clampChannel(b + (255 - b) * amount)})`
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgb(${clampChannel(r * (1 - amount))}, ${clampChannel(
    g * (1 - amount)
  )}, ${clampChannel(b * (1 - amount))})`
}
