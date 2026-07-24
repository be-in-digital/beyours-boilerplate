"use client"

/**
 * Stable anonymous device identifier for the play cooldown.
 * A UUID persisted in localStorage — enough friction for a table game
 * (the server also matches on email at claim time).
 */

const STORAGE_KEY = "beid_game_device"

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server"
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // localStorage unavailable (private mode) — session-scoped fallback.
    return "anonymous"
  }
}
