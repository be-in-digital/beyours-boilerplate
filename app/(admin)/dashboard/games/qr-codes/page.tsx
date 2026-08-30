// DELIBERATE DIVERGENCE from apps/reference — do not align.
// The gamification module is not part of what a client buys today, so this
// template shows the screen behind ComingSoon while the bench renders the real
// GameQrCodesPage from @be-in-digital/admin. The route stays declared on purpose: the
// sidebar links to it, and a placeholder is a better answer than a 404.
// The player-facing half is stubbed the same way — see
// app/game/[qrCodeId]/_components/GameContent.tsx.
import { ComingSoon } from "@be-in-digital/admin"

export default function Page() {
  return (
    <ComingSoon
      title="QR Codes"
      description="Générez et gérez les QR codes pour vos tables. Chaque QR code permet à vos clients d'accéder au jeu."
    />
  )
}
