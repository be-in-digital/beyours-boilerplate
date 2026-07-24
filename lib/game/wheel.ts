import type { GamePrize, WheelSectionConfig } from "./types"
import type { Id } from "@/convex/_generated/dataModel"

/**
 * Wheel layout + landing math, kept pure for unit tests.
 *
 * The wheel is presentational: the server decides win/lose + prize, then the
 * client picks a segment matching that outcome and animates the wheel to it.
 */

export interface WheelSegment {
  label: string
  color: string
  textColor: string
  prizeId?: Id<"prizes">
  isWinning: boolean
}

/** Casino-grade palette: vivid jewel tones for prizes, deep tones for lose. */
const PRIZE_COLORS = [
  { bg: "#E8483F", text: "#FFFFFF" }, // vermilion
  { bg: "#F5A524", text: "#3A1D00" }, // gold
  { bg: "#7C3AED", text: "#FFFFFF" }, // violet
  { bg: "#0D9488", text: "#FFFFFF" }, // teal
  { bg: "#DB2777", text: "#FFFFFF" }, // magenta
  { bg: "#2563EB", text: "#FFFFFF" }, // royal blue
]
const LOSE_COLORS = [
  { bg: "#2A2139", text: "#B9AECF" }, // deep plum
  { bg: "#1E2A3A", text: "#A7BDD4" }, // deep navy
]

export const LOSE_LABELS = ["Perdu", "Rejouez", "Presque !", "Dommage"]

/**
 * Build display segments. Uses the admin-configured sections when present,
 * otherwise interleaves available prizes with lose slots (8 segments).
 */
export function buildWheelSegments(
  prizes: GamePrize[],
  configSections?: WheelSectionConfig[]
): WheelSegment[] {
  if (configSections && configSections.length >= 2) {
    return configSections.map((s) => ({
      label: s.label,
      color: s.color,
      textColor: "#FFFFFF",
      prizeId: s.prizeId,
      isWinning: s.isWinning ?? s.prizeId !== undefined,
    }))
  }

  const count = 8
  const segments: WheelSegment[] = []
  if (prizes.length === 0) {
    for (let i = 0; i < count; i++) {
      const palette = LOSE_COLORS[i % LOSE_COLORS.length]!
      segments.push({
        label: LOSE_LABELS[i % LOSE_LABELS.length]!,
        color: palette.bg,
        textColor: palette.text,
        isWinning: false,
      })
    }
    return segments
  }

  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const prize = prizes[(i / 2) % prizes.length]!
      const palette = PRIZE_COLORS[(i / 2) % PRIZE_COLORS.length]!
      segments.push({
        label: prize.name,
        color: palette.bg,
        textColor: palette.text,
        prizeId: prize.id,
        isWinning: true,
      })
    } else {
      const palette = LOSE_COLORS[Math.floor(i / 2) % LOSE_COLORS.length]!
      segments.push({
        label: LOSE_LABELS[Math.floor(i / 2) % LOSE_LABELS.length]!,
        color: palette.bg,
        textColor: palette.text,
        isWinning: false,
      })
    }
  }
  return segments
}

/**
 * Pick the segment the wheel must land on for a resolved outcome.
 * Losing lands next to a winning segment when possible — the near-miss.
 */
export function pickTargetSegment(
  segments: WheelSegment[],
  didWin: boolean,
  prizeId?: Id<"prizes"> | null,
  random: () => number = Math.random
): number {
  if (didWin) {
    const exact = segments
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.prizeId === prizeId)
    if (exact.length > 0) return exact[Math.floor(random() * exact.length)]!.i
    const winning = segments.map((s, i) => ({ s, i })).filter(({ s }) => s.isWinning)
    if (winning.length > 0) return winning[Math.floor(random() * winning.length)]!.i
    return 0
  }

  const losing = segments.map((s, i) => ({ s, i })).filter(({ s }) => !s.isWinning)
  if (losing.length === 0) return 0
  const nearMiss = losing.filter(({ i }) => {
    const prev = segments[(i - 1 + segments.length) % segments.length]!
    const next = segments[(i + 1) % segments.length]!
    return prev.isWinning || next.isWinning
  })
  const pool = nearMiss.length > 0 ? nearMiss : losing
  return pool[Math.floor(random() * pool.length)]!.i
}

/**
 * Absolute final rotation (radians) landing `index` under the top pointer.
 * Adds full turns for drama and a small jitter inside the segment so the
 * wheel never stops dead-center twice in a row.
 */
export function finalRotationForSegment(
  index: number,
  segmentCount: number,
  options: { turns?: number; jitter?: number; random?: () => number } = {}
): number {
  const random = options.random ?? Math.random
  const turns = options.turns ?? 5 + Math.floor(random() * 3)
  const arc = (Math.PI * 2) / segmentCount
  // Segment i spans [i*arc, (i+1)*arc) when rotation = 0; the pointer sits at
  // -PI/2 (top). Rotating by R moves segment content to angle + R.
  const segmentCenter = index * arc + arc / 2
  const jitterAmp = (options.jitter ?? 0.72) * (arc / 2)
  const jitter = (random() * 2 - 1) * jitterAmp
  const base = -Math.PI / 2 - segmentCenter + jitter
  return turns * Math.PI * 2 + normalizeAngle(base)
}

function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2
  return ((angle % twoPi) + twoPi) % twoPi
}

/** Segment index currently under the top pointer for a given rotation. */
export function segmentAtPointer(rotation: number, segmentCount: number): number {
  const arc = (Math.PI * 2) / segmentCount
  const pointerAngle = normalizeAngle(-Math.PI / 2 - rotation)
  return Math.floor(pointerAngle / arc) % segmentCount
}

/** Deceleration curve: fast launch, long suspenseful crawl at the end. */
export function wheelEase(t: number): number {
  const clamped = Math.min(1, Math.max(0, t))
  return 1 - Math.pow(1 - clamped, 4.2)
}
