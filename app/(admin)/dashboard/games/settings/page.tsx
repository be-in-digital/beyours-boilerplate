// DELIBERATE DIVERGENCE from apps/reference — do not align.
// This route does not exist in the bench: it was declared in `adminRoutes`,
// linked from nowhere, and deleted there rather than left answering 404. The
// template keeps it because its sidebar does link to it, behind the same
// ComingSoon as the other gamification screens.
import { ComingSoon } from "@be-in-digital/admin"

export default function Page() {
  return (
    <ComingSoon
      title="Paramètres Gamification"
      description="Configurez les réglages globaux : délai entre les parties, activation du module et actions requises."
    />
  )
}
