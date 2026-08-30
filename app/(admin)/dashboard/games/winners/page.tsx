// DELIBERATE DIVERGENCE from apps/reference — do not align.
// The gamification module is not part of what a client buys today, so this
// template shows the screen behind ComingSoon while the bench renders the real
// GameWinnersPage from @be-in-digital/admin. The route stays declared on purpose: the
// sidebar links to it, and a placeholder is a better answer than a 404.
// The player-facing half is stubbed the same way — see
// app/game/[qrCodeId]/_components/GameContent.tsx.
import { ComingSoon } from "@be-in-digital/admin"

export default function Page() {
  return (
    <ComingSoon
      title="Gagnants"
      description="Consultez l'historique des parties jouées, les gagnants et le suivi des lots réclamés."
    />
  )
}
