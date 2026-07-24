"use client"

/**
 * Haptic feedback wrapper (navigator.vibrate).
 * Degrades silently where unsupported (iOS Safari has no vibrate API).
 */

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return
  if (typeof navigator.vibrate !== "function") return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Some browsers throw when called outside a user gesture — ignore.
  }
}

export const haptics = {
  /** One wheel peg crossing / scratch stroke. */
  tick(): void {
    vibrate(8)
  },
  /** Button press. */
  light(): void {
    vibrate(15)
  },
  /** Action completed / card flip. */
  medium(): void {
    vibrate(35)
  },
  /** Win celebration. */
  success(): void {
    vibrate([40, 60, 40, 60, 120])
  },
  /** Lose — one soft, short buzz. */
  fail(): void {
    vibrate([60, 40, 30])
  },
  stop(): void {
    vibrate(0)
  },
}
