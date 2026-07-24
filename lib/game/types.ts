import type { Id } from "@/convex/_generated/dataModel"

/** Client mirrors of the public payloads returned by convex/gamePlay.ts. */

export interface GamePrize {
  id: Id<"prizes">
  name: string
  description?: string
  imageUrl?: string
  type: "discount_percentage" | "discount_fixed" | "free_product" | "free_menu" | "custom"
  value?: number
  validityDays: number
}

export type GameActionType =
  | "google_review"
  | "instagram_follow"
  | "facebook_like"
  | "tiktok_follow"
  | "email_subscribe"

export interface GameAction {
  id: Id<"requiredActions">
  type: GameActionType
  name: string
  description?: string
  url?: string
  icon?: string
  isRequired: boolean
  timerSeconds?: number
}

export interface WheelSectionConfig {
  label: string
  color: string
  prizeId?: Id<"prizes">
  isWinning?: boolean
  probability?: number
}

export interface GameConfig {
  wheelSections?: WheelSectionConfig[]
  scratchCardDesign?: string
  backgroundImage?: string
  primaryColor?: string
  secondaryColor?: string
  cooldownHours?: number
  actionMode?: "all" | "sequential"
  referral?: { enabled: boolean; friendRewardLabel?: string }
}

/** Progression des actions pour ce device (mode "sequential"). */
export type ActionProgression =
  | { mode: "all" }
  | {
      mode: "sequential"
      completedActionIds: string[]
      currentActionId: string | null
      allDone: boolean
    }

/** État du parrainage renvoyé par getSession. */
export interface ReferralState {
  enabled: boolean
  isFriendWelcome: boolean
  friendRewardLabel?: string
  pendingBonuses: number
  myShareCode: string | null
}

export interface GameSession {
  status: "ready"
  qrCodeId: Id<"gameQRCodes">
  tableNumber?: string
  store: { id: Id<"stores">; name: string }
  game: {
    id: Id<"games">
    type: "wheel" | "scratch_card"
    name: string
    description?: string
    config?: GameConfig
  }
  actions: GameAction[]
  prizes: GamePrize[]
  progression: ActionProgression
  referral: ReferralState
  cooldown: { active: boolean; nextPlayAt?: number }
}

export interface PlayResult {
  playId: Id<"gamePlays">
  didWin: boolean
  prize: GamePrize | null
  nextPlayAt: number
}

export type GamePhase =
  | "loading"
  | "unavailable"
  | "welcome"
  | "actions"
  | "referral"
  | "game"
  | "result"
  | "claim"
  | "reward"
  | "cooldown"

/** "HH:MM:SS" countdown used by cooldown + ticket screens. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
